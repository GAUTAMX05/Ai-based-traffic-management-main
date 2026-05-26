import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProcessingCard from './components/ProcessingCard';

function Live() {
  const [liveState, setLiveState] = useState({
    status: 'waiting',
    message: 'Waiting for upload...',
    processed: 0,
    total: 4,
    counts: [],
    optimization: null,
    current: null,
    error: null,
  });

  const formatNumber = (value) => {
    return typeof value === 'number' ? Math.round(value) : '—';
  };

  const getSignalTimings = (optimization) => {
    const yellowSeconds = 3;
    const greens = {
      north: optimization?.north,
      south: optimization?.south,
      west: optimization?.west,
      east: optimization?.east,
    };

    const greenValues = Object.values(greens);
    const hasAllGreens = greenValues.every((v) => typeof v === 'number' && Number.isFinite(v));

    if (!hasAllGreens) {
      return {
        green: { north: null, south: null, west: null, east: null },
        orange: { north: null, south: null, west: null, east: null },
        red: { north: null, south: null, west: null, east: null },
      };
    }

    const cycleSeconds = greens.north + greens.south + greens.west + greens.east + 4 * yellowSeconds;
    const mk = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

    return {
      green: {
        north: mk(greens.north),
        south: mk(greens.south),
        west: mk(greens.west),
        east: mk(greens.east),
      },
      orange: {
        north: yellowSeconds,
        south: yellowSeconds,
        west: yellowSeconds,
        east: yellowSeconds,
      },
      red: {
        north: mk(cycleSeconds - greens.north - yellowSeconds),
        south: mk(cycleSeconds - greens.south - yellowSeconds),
        west: mk(cycleSeconds - greens.west - yellowSeconds),
        east: mk(cycleSeconds - greens.east - yellowSeconds),
      },
    };
  };

  const signalTimings = getSignalTimings(liveState.optimization);
  const progressPercent = liveState.total ? (liveState.processed / liveState.total) * 100 : 0;

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get('http://localhost:5000/status');
        setLiveState(response.data);
      } catch (error) {
        console.error('Error fetching live status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const directions = [
    { key: 'north', label: 'North', videoIndex: 0 },
    { key: 'south', label: 'South', videoIndex: 1 },
    { key: 'west', label: 'West', videoIndex: 2 },
    { key: 'east', label: 'East', videoIndex: 3 },
  ];

  const scannedText = `Processing ${liveState.processed}/${liveState.total} completed`;
  const scannedSubText = `${liveState.processed} of ${liveState.total} videos scanned`;

  const badgeText =
    liveState.status === 'processing' ? 'Scanning' :
    liveState.status === 'done' ? 'Done' :
    liveState.status === 'error' ? 'Error' : 'Idle';

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header__inner">
          <div className="dashboard-title">
            <span className="dashboard-title__icon" aria-hidden="true">📡</span>
            <span className="dashboard-title__text">Live Video Processing</span>
          </div>
          <div className="dashboard-status">
            <span className="status-pill">
              <span className="status-pill__dot" />
              {badgeText}
            </span>
          </div>
        </div>
      </header>

      <main className="dashboard-shell">
        <div className="dashboard-top">
          <div className="dashboard-copy">
            <div className="dashboard-message">{liveState.message}</div>
            <div className="dashboard-metrics">
              <div className="metric-line">
                <span className="metric-label">Progress</span>
                <span className="metric-value accent">{scannedText}</span>
              </div>
              <div className="metric-line">
                <span className="metric-label">Scanned</span>
                <span className="metric-value">{scannedSubText}</span>
              </div>
              {liveState.current && (
                <div className="metric-line">
                  <span className="metric-label">Now</span>
                  <span className="metric-value">{liveState.current}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {liveState.status === 'processing' && (
          <>
            <ProcessingCard percent={progressPercent} />
          </>
        )}

        {liveState.status === 'error' && (
          <div className="error-message">
            <h2>Error</h2>
            <p>{liveState.error}</p>
          </div>
        )}

        <section className="dashboard-grid" aria-label="Direction cards">
          {directions.map((d) => {
            const idx = d.videoIndex;
            const isLive = liveState.status === 'processing';
            const badge = isLive ? 'Live' : (liveState.status === 'done' ? 'Completed' : 'Preview');
            const badgeTone = isLive ? 'badge--live' : (liveState.status === 'done' ? 'badge--done' : 'badge--neutral');

            return (
              <article key={d.key} className="dir-card fade-in">
                <div className="dir-card__top">
                  <div className="dir-title">
                    <div className="dir-title__name">{d.label}</div>
                    <div className="dir-title__sub">Traffic Light: <span className="accent">{`TL-${d.label}`}</span></div>
                  </div>
                  <div className={`badge ${badgeTone}`}>{badge}</div>
                </div>

                <div className="dir-preview">
                  <video className="dir-video" autoPlay muted playsInline>
                    <source src={`http://localhost:5000/videos/video_${idx}.mp4`} type="video/mp4" />
                  </video>
                </div>

                <div className="dir-meta">
                  <div className="traffic-lights" aria-label="Traffic lights">
                    <span className="tl tl--red" />
                    <span className="tl tl--yellow" />
                    <span className="tl tl--green" />
                  </div>

                  <div className="kv">
                    <div className="kv-row">
                      <span className="kv-k">Vehicles</span>
                      <span className="kv-v accent">{formatNumber(liveState.counts?.[idx])}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-k">Optimization (sec)</span>
                      <span className="kv-v">{formatNumber(liveState.optimization?.[d.key])}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-k">🟢 Green</span>
                      <span className="kv-v">{formatNumber(signalTimings.green?.[d.key])}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-k">🟡 Yellow</span>
                      <span className="kv-v">{formatNumber(signalTimings.orange?.[d.key])}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-k">🔴 Red</span>
                      <span className="kv-v">{formatNumber(signalTimings.red?.[d.key])}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

export default Live;
