#!/usr/bin/env python3
"""Send an ESC/POS receipt to the BP210 over its USB bulk-out endpoint."""

import argparse
import sys

import usb.core
import usb.util


DEFAULT_VENDOR_ID = 0x0FE6
DEFAULT_PRODUCT_ID = 0x811E


def parse_number(value: str) -> int:
    return int(value, 0)


def open_printer(vendor_id: int, product_id: int):
    device = usb.core.find(idVendor=vendor_id, idProduct=product_id)
    if device is None:
        raise RuntimeError(
            f"BP210 USB device {vendor_id:#06x}:{product_id:#06x} was not found"
        )

    try:
        device.set_configuration()
    except usb.core.USBError as error:
        # EBUSY means the device is already configured, which is safe here.
        if getattr(error, "errno", None) != 16:
            raise

    configuration = device.get_active_configuration()
    interface = usb.util.find_descriptor(
        configuration,
        custom_match=lambda candidate: candidate.bInterfaceClass == 7,
    )
    if interface is None:
        raise RuntimeError("BP210 printer interface was not found")

    interface_number = interface.bInterfaceNumber
    if device.is_kernel_driver_active(interface_number):
        device.detach_kernel_driver(interface_number)
    usb.util.claim_interface(device, interface_number)

    endpoint = usb.util.find_descriptor(
        interface,
        custom_match=lambda candidate: usb.util.endpoint_direction(
            candidate.bEndpointAddress
        ) == usb.util.ENDPOINT_OUT,
    )
    if endpoint is None:
        usb.util.release_interface(device, interface_number)
        raise RuntimeError("BP210 bulk-out endpoint was not found")

    return device, interface_number, endpoint


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vendor-id", type=parse_number, default=DEFAULT_VENDOR_ID)
    parser.add_argument("--product-id", type=parse_number, default=DEFAULT_PRODUCT_ID)
    parser.add_argument("--probe", action="store_true")
    args = parser.parse_args()

    device = None
    interface_number = None
    try:
        device, interface_number, endpoint = open_printer(
            args.vendor_id, args.product_id
        )
        if args.probe:
            print(
                f"BP210 ready at USB endpoint {endpoint.bEndpointAddress:#04x}",
                flush=True,
            )
            return 0

        payload = sys.stdin.buffer.read()
        if not payload:
            raise RuntimeError("No receipt data was provided")

        for offset in range(0, len(payload), 4096):
            endpoint.write(payload[offset : offset + 4096], timeout=5000)
        return 0
    except Exception as error:  # Hardware errors must be visible to the Node service.
        print(str(error), file=sys.stderr, flush=True)
        return 1
    finally:
        if device is not None and interface_number is not None:
            try:
                usb.util.release_interface(device, interface_number)
            except usb.core.USBError:
                pass
            usb.util.dispose_resources(device)


if __name__ == "__main__":
    raise SystemExit(main())
