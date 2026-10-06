"""Low-level HX711 reader using lgpio, compatible with Raspberry Pi OS."""
import time
from threading import Lock

try:
    import lgpio
except ImportError:  # Allows a useful error when copied to a non-Pi computer.
    lgpio = None


class HX711Error(RuntimeError):
    """Raised when the ADC cannot be read safely."""


class HX711:
    """Read signed 24-bit samples from one HX711 at gain 128 / channel A."""

    def __init__(self, dt_pin: int, sck_pin: int, chip: int = 0, ready_timeout: float = 2.0):
        if lgpio is None:
            raise HX711Error("lgpio is not installed. Install python3-lgpio on the Raspberry Pi.")

        self.dt_pin = dt_pin
        self.sck_pin = sck_pin
        self.ready_timeout = ready_timeout
        self._lock = Lock()
        self._chip_handle = lgpio.gpiochip_open(chip)

        try:
            lgpio.gpio_claim_input(self._chip_handle, self.dt_pin)
            lgpio.gpio_claim_output(self._chip_handle, self.sck_pin, 0)
        except Exception:
            lgpio.gpiochip_close(self._chip_handle)
            raise

    def close(self) -> None:
        if self._chip_handle is not None:
            lgpio.gpiochip_close(self._chip_handle)
            self._chip_handle = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()

    def _wait_until_ready(self) -> None:
        deadline = time.monotonic() + self.ready_timeout
        while time.monotonic() < deadline:
            if lgpio.gpio_read(self._chip_handle, self.dt_pin) == 0:
                return
            time.sleep(0.001)
        raise HX711Error(
            f"HX711 on DT GPIO{self.dt_pin} did not become ready within {self.ready_timeout:.1f}s"
        )

    def read_raw(self) -> int:
        """Return one signed 24-bit ADC reading and restore gain 128."""
        if self._chip_handle is None:
            raise HX711Error("HX711 is closed")

        with self._lock:
            self._wait_until_ready()
            value = 0
            for _ in range(24):
                lgpio.gpio_write(self._chip_handle, self.sck_pin, 1)
                lgpio.gpio_write(self._chip_handle, self.sck_pin, 0)
                # Each rising edge shifts the next bit out. Read it after the
                # falling edge; the initial DOUT-low ready state is not data.
                # No sleep occurs while HIGH, preventing an accidental power-down.
                value = (value << 1) | lgpio.gpio_read(self._chip_handle, self.dt_pin)

            # The 25th pulse selects channel A with gain 128 for the next read.
            lgpio.gpio_write(self._chip_handle, self.sck_pin, 1)
            lgpio.gpio_write(self._chip_handle, self.sck_pin, 0)

        if value & 0x800000:
            value -= 1 << 24
        return value
