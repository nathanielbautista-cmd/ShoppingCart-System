import unittest
from unittest.mock import patch

import load_cell


class LoadCellFilteringTests(unittest.TestCase):
    def test_zero_mad_electrical_spike_is_removed(self):
        center, spread, count = load_cell.summarize_samples(
            [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 9000]
        )

        self.assertEqual(center, 1000)
        self.assertEqual(spread, 0)
        self.assertEqual(count, 8)

    def test_median_keeps_center_resistant_to_skew(self):
        center, spread, count = load_cell.summarize_samples(
            [98, 99, 100, 100, 101, 102, 103]
        )

        self.assertEqual(center, 100)
        self.assertEqual(spread, 5)
        self.assertEqual(count, 7)

    def test_calibration_rejects_signal_buried_in_noise(self):
        cell = load_cell.LoadCell.__new__(load_cell.LoadCell)
        cell.sensor_id = "hx711_1"
        cell.raw_samples = lambda count=15: [990, 1010, 995, 1005, 1000] * 3
        calibration = {
            "hx711_1": {
                "tare_offset": 900.0,
                "tare_spread_raw": 20.0,
            }
        }

        with patch.object(load_cell, "load_calibration_data", return_value=calibration), patch.object(
            load_cell, "save_calibration_data"
        ) as save_mock:
            with self.assertRaisesRegex(load_cell.CalibrationRequiredError, "too noisy"):
                cell.calibrate(220)

        save_mock.assert_not_called()

    def test_calibration_saves_clean_signal_quality(self):
        cell = load_cell.LoadCell.__new__(load_cell.LoadCell)
        cell.sensor_id = "hx711_1"
        cell.raw_samples = lambda count=15: [10998, 10999, 11000, 11001, 11002] * 3
        calibration = {
            "hx711_1": {
                "tare_offset": 1000.0,
                "tare_spread_raw": 4.0,
            }
        }

        with patch.object(load_cell, "load_calibration_data", return_value=calibration), patch.object(
            load_cell, "save_calibration_data"
        ) as save_mock:
            factor = cell.calibrate(200)

        self.assertEqual(factor, 50.0)
        saved = save_mock.call_args.args[0]["hx711_1"]
        self.assertEqual(saved["calibration_signal_to_noise_ratio"], 2500.0)


if __name__ == "__main__":
    unittest.main()
