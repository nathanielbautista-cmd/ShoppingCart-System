#!/usr/bin/env python3
"""Send an ESC/POS receipt to the BP210 over its USB bulk-out endpoint."""

import argparse
import os
import socket
import sys

import usb.core
import usb.util


DEFAULT_VENDOR_ID = 0x0FE6
DEFAULT_PRODUCT_ID = 0x811E
DEFAULT_BLUETOOTH_CHANNEL = 1


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


def open_bluetooth_printer(address: str, channel: int):
    if not address:
        raise RuntimeError("BP210 Bluetooth address is not configured")

    connection = socket.socket(
        socket.AF_BLUETOOTH,
        socket.SOCK_STREAM,
        socket.BTPROTO_RFCOMM,
    )
    connection.settimeout(10)
    try:
        connection.connect((address, channel))
    except Exception:
        connection.close()
        raise
    return connection


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--transport",
        choices=("usb", "bluetooth"),
        default=os.environ.get("RECEIPT_PRINTER_TRANSPORT", "usb"),
    )
    parser.add_argument("--vendor-id", type=parse_number, default=DEFAULT_VENDOR_ID)
    parser.add_argument("--product-id", type=parse_number, default=DEFAULT_PRODUCT_ID)
    parser.add_argument(
        "--bluetooth-address",
        default=os.environ.get("RECEIPT_PRINTER_BLUETOOTH_ADDRESS", ""),
    )
    parser.add_argument(
        "--bluetooth-channel",
        type=int,
        default=int(
            os.environ.get(
                "RECEIPT_PRINTER_BLUETOOTH_CHANNEL",
                str(DEFAULT_BLUETOOTH_CHANNEL),
            )
        ),
    )
    parser.add_argument("--probe", action="store_true")
    args = parser.parse_args()

    device = None
    interface_number = None
    bluetooth_connection = None
    try:
        if args.transport == "bluetooth":
            bluetooth_connection = open_bluetooth_printer(
                args.bluetooth_address,
                args.bluetooth_channel,
            )
            if args.probe:
                print(
                    "BP210 ready over Bluetooth "
                    f"{args.bluetooth_address} channel {args.bluetooth_channel}",
                    flush=True,
                )
                return 0

            payload = sys.stdin.buffer.read()
            if not payload:
                raise RuntimeError("No receipt data was provided")
            bluetooth_connection.sendall(payload)
            return 0

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
        if bluetooth_connection is not None:
            bluetooth_connection.close()
        if device is not None and interface_number is not None:
            try:
                usb.util.release_interface(device, interface_number)
            except usb.core.USBError:
                pass
            usb.util.dispose_resources(device)


if __name__ == "__main__":
    raise SystemExit(main())
