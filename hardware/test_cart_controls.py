import json
import unittest
from unittest.mock import patch

import cart_controls


class FakeLgpio:
    SET_PULL_UP = 1

    def __init__(self):
        self.outputs = []

    def gpiochip_open(self, _chip):
        return 10

    def gpio_claim_input(self, _handle, _pin, _pull):
        pass

    def gpio_read(self, _handle, _pin):
        return 1

    def gpio_claim_output(self, _handle, pin, value):
        self.outputs.append((pin, value))

    def gpio_write(self, _handle, pin, value):
        self.outputs.append((pin, value))

    def gpiochip_close(self, _handle):
        pass


class FakeResponse:
    status = 202

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        pass


class CartControlsTests(unittest.TestCase):
    def setUp(self):
        self.fake_gpio = FakeLgpio()
        self.urlopen = patch.object(cart_controls, 'urlopen', return_value=FakeResponse())
        self.urlopen_mock = self.urlopen.start()
        self.addCleanup(self.urlopen.stop)
        with patch.object(cart_controls, 'lgpio', self.fake_gpio):
            self.controls = cart_controls.CartControls('http://localhost:5000')
        cart_controls.lgpio = self.fake_gpio
        self.addCleanup(self.controls.close)

    def emitted_actions(self):
        return [
            json.loads(call.args[0].data.decode('utf-8'))['action']
            for call in self.urlopen_mock.call_args_list
        ]

    def test_power_toggles_led_and_event(self):
        self.controls.press('power')
        self.controls.press('power')

        self.assertEqual(self.emitted_actions(), ['power_off', 'power_on'])
        self.assertEqual(self.fake_gpio.outputs[-2:], [(25, 0), (25, 1)])

    def test_add_and_delete_work_on_start_and_stop_when_powered_off(self):
        self.controls.press('add_product')
        self.controls.press('delete_product')
        self.assertEqual(self.emitted_actions(), ['add_product', 'delete_product'])

        self.controls.press('power')
        self.controls.press('add_product')
        self.controls.press('delete_product')
        self.assertEqual(
            self.emitted_actions(),
            ['add_product', 'delete_product', 'power_off'],
        )

    def test_restart_is_available_while_powered_off(self):
        self.controls.press('restart')
        self.assertEqual(self.emitted_actions(), ['restart'])

    def test_red_alarm_led_blinks_only_while_powered_and_active(self):
        self.controls.alarm_active = True
        self.controls.update_alarm_led(2.0)
        self.controls.update_alarm_led(2.25)
        self.assertEqual(self.fake_gpio.outputs[-2:], [(18, True), (18, False)])

        self.controls.press('power')
        self.controls.update_alarm_led(3.0)
        self.assertEqual(self.fake_gpio.outputs[-1], (18, 0))


if __name__ == '__main__':
    unittest.main()
