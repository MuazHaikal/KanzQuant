import numpy as np
import pandas as pd
from research.features import expanding_zscore
from research.pipeline import point_in_time_monthly
from research.regimes import fit_regimes
from research.similarity import cosine_scores, forward_returns, select_spaced_neighbours


def test_expanding_zscore_has_no_future_leakage():
    idx=pd.date_range("2010-01-31",periods=48,freq="ME"); original=pd.Series(np.arange(48,dtype=float),index=idx); changed=original.copy(); changed.iloc[40:]+=1000
    assert expanding_zscore(original).iloc[:40].equals(expanding_zscore(changed).iloc[:40])


def test_temporal_neighbour_exclusion():
    idx=pd.date_range("2000-01-31",periods=36,freq="ME"); scores=pd.Series(np.linspace(1,0,36),index=idx)
    selected=select_spaced_neighbours(scores,k=4,min_gap_months=6)
    months=[d.year*12+d.month for d in selected.index]
    assert all(abs(a-b)>=6 for i,a in enumerate(months) for b in months[i+1:])


def test_similarity_ranks_known_vector_first():
    idx=pd.date_range("2020-01-31",periods=4,freq="ME"); states=pd.DataFrame([[1,0],[0,1],[.9,.1],[1,0]],index=idx)
    assert cosine_scores(states).index[0]==idx[0]


def test_forward_return_horizons():
    idx=pd.date_range("2020-01-31",periods=14,freq="ME"); prices=pd.Series(100*np.power(1.01,np.arange(14)),index=idx)
    result=forward_returns(prices,[idx[0]])
    assert np.isclose(result.iloc[0]["1m"],1.0) and np.isclose(result.iloc[0]["12m"],(1.01**12-1)*100)


def test_regime_reproducibility():
    rng=np.random.default_rng(7); idx=pd.date_range("2000-01-31",periods=100,freq="ME"); states=pd.DataFrame(rng.normal(size=(100,6)),index=idx)
    first,_,_=fit_regimes(states); second,_,_=fit_regimes(states)
    assert first.regime_id.equals(second.regime_id)


def test_monthly_release_is_not_visible_in_its_observation_month():
    raw = pd.Series([100.0, 110.0], index=pd.to_datetime(["2020-01-01", "2020-02-01"]))
    aligned = point_in_time_monthly(raw, "Monthly", pd.Timestamp("2020-03-31"))
    assert aligned.loc["2020-02-29"] == 100.0
    assert aligned.loc["2020-03-31"] == 110.0


def test_quarterly_release_is_delayed_and_then_carried_forward():
    raw = pd.Series([1.0, 2.0], index=pd.to_datetime(["2020-01-01", "2020-04-01"]))
    aligned = point_in_time_monthly(raw, "Quarterly", pd.Timestamp("2020-08-31"))
    assert aligned.first_valid_index() == pd.Timestamp("2020-04-30")
    assert aligned.loc["2020-06-30"] == 1.0
    assert aligned.loc["2020-07-31"] == 2.0


def test_similarity_excludes_recent_target_neighbours():
    idx = pd.date_range("2020-01-31", periods=30, freq="ME")
    states = pd.DataFrame({"a": np.arange(30) + 1.0, "b": np.ones(30)}, index=idx)
    scores = cosine_scores(states, target_exclusion_months=12)
    assert scores.index.max() <= idx[-1] - pd.DateOffset(months=12)


def test_missing_future_prices_remain_null():
    idx = pd.date_range("2020-01-31", periods=4, freq="ME")
    result = forward_returns(pd.Series([100, 101, 102, 103], index=idx), [idx[-1]])
    assert result.iloc[0].isna().all()
