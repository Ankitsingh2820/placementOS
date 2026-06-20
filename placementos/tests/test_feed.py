import pytest
from services.feed import tag_eligibility


def test_worldwide_is_green():
    assert tag_eligibility("We hire worldwide, async team") == "green"


def test_us_only_is_red():
    assert tag_eligibility("Must be authorized to work in the US only") == "red"


def test_pst_overlap_is_yellow():
    assert tag_eligibility("Requires 4h overlap with PST timezone") == "yellow"


def test_no_signal_defaults_green():
    assert tag_eligibility("Senior Python developer, fully remote") == "green"


def test_india_ok_is_green():
    assert tag_eligibility("India OK, global team, async-first") == "green"


def test_eu_only_is_red():
    assert tag_eligibility("EU only applicants, must reside in Europe") == "red"


def test_hire_globally_is_green():
    assert tag_eligibility("We hire globally across all timezones") == "green"
