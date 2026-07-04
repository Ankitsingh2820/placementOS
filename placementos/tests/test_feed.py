import pytest
from services.feed import tag_eligibility


# Remote roles: green unless an explicit region-exclusion keyword appears
def test_remote_worldwide_is_green():
    assert tag_eligibility("We hire worldwide, async team", "remote") == "green"


def test_remote_us_only_is_red():
    assert tag_eligibility("Must be authorized to work in the US only", "remote") == "red"


def test_remote_eu_only_is_red():
    assert tag_eligibility("EU only applicants, must reside in Europe", "remote") == "red"


def test_remote_no_signal_defaults_green():
    assert tag_eligibility("Senior Python developer, fully remote", "remote") == "green"


def test_remote_hire_globally_is_green():
    assert tag_eligibility("We hire globally across all timezones", "remote") == "green"


def test_remote_timezone_overlap_is_green():
    # timezone overlap is not a region exclusion -> still green for remote
    assert tag_eligibility("Requires 4h overlap with PST timezone", "remote") == "green"


# Onsite/hybrid roles: green only when an India location is present
def test_onsite_india_location_is_green():
    assert tag_eligibility("Onsite role in Bangalore", "onsite") == "green"


def test_onsite_non_india_is_red():
    assert tag_eligibility("Onsite role in Berlin, Germany", "onsite") == "red"


def test_hybrid_india_location_is_green():
    assert tag_eligibility("Hybrid - 3 days in our Pune office", "hybrid") == "green"


def test_hybrid_non_india_is_red():
    assert tag_eligibility("Hybrid role based in London", "hybrid") == "red"
