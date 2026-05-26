import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import './styles.css';
import Live from './Live';

function Home() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatNumber = (value) => {
    return typeof value === 'number' ? Math.round(value) : '—';
  };

  const runProgress = useMemo(() => {
    // Frontend doesn't know true progress; show a smooth indeterminate-ish ramp.
    if (!loading) return 0;
    return 65;
  }, [loading]);

  const addFiles = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    // Keep at most 4 files (latest chosen wins).
    const merged = [...selectedFiles, ...list].slice(0, 4);
    setSelectedFiles(merged);
  };

  const removeFileAt = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length < 1 || selectedFiles.length > 4) {
      alert('Please upload between 1 and 4 videos.');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('videos', file));

    // Auto-open live view on the user click (may require allowing popups).
    const liveUrl = `${window.location.origin}/live`;
    window.open(liveUrl, '_blank', 'noopener,noreferrer');
    localStorage.setItem('traffic-live-status', JSON.stringify({ status: 'processing', message: 'Processing all videos live...' }));

    try {
      setLoading(true);
      setResult(null);
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data;
      setResult(data);
      localStorage.setItem('traffic-live-status', JSON.stringify({ status: 'done', counts: data.counts, optimization: data.optimization, message: 'Live processing complete.' }));
      setLoading(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      setLoading(false);
      localStorage.setItem('traffic-live-status', JSON.stringify({ status: 'error', error: error.message || 'Upload failed', message: 'Processing failed.' }));
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header__inner">
          <div className="brand">
            <div className="brand__icon" aria-hidden="true">🚦</div>
            <div className="brand__text">AI Based Traffic Management</div>
          </div>
          <div className="header-right">
            <div className="traffic-lights landing-lights" aria-label="Traffic lights">
              <span className="tl tl--red" />
              <span className="tl tl--yellow" />
              <span className="tl tl--green" />
            </div>
          </div>
        </div>
      </header>

      <main className="landing-shell">
        <div className="landing-grid">
          <section className="landing-left fade-in">
            <div className="hero-card">
              <div className="hero-kicker">🤖 AI + Computer Vision</div>
              <h1 className="hero-title">
                Optimize <span className="grad-text">Traffic Flow</span> with AI
              </h1>
              <p className="hero-sub">
                Upload intersection videos and get vehicle counts + optimized signal timings.
                Live monitoring opens in a new tab while your model runs.
              </p>
            </div>

            <div className="upload-card">
              <div className="section-title">
                <span aria-hidden="true">📤</span>
                Upload traffic videos
              </div>
              <div className="section-help">
                Choose <span className="accent">1–4</span> videos (mp4/any video). Drag & drop is supported.
              </div>

              <form onSubmit={handleSubmit} className="upload-form">
                <label
                  className={`upload-dropzone ${isDragOver ? 'upload-dropzone--active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    addFiles(e.dataTransfer.files);
                  }}
                >
                  <input
                    className="upload-input"
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                  <div className="dropzone-inner">
                    <div className="dropzone-icon" aria-hidden="true">🧠</div>
                    <div className="dropzone-text">
                      <div className="dropzone-title">Drag & drop videos here</div>
                      <div className="dropzone-sub">or click to browse</div>
                    </div>
                  </div>
                </label>

                {selectedFiles.length > 0 && (
                  <div className="file-tags" aria-label="Selected files">
                    {selectedFiles.map((f, idx) => (
                      <button
                        type="button"
                        key={`${f.name}-${idx}`}
                        className="file-tag"
                        onClick={() => removeFileAt(idx)}
                        title="Remove file"
                      >
                        <span className="file-tag__name">{f.name}</span>
                        <span className="file-tag__x" aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="actions">
                  <button className={`cta ${loading ? 'cta--loading' : ''}`} type="submit" disabled={loading}>
                    <span className="cta__label">{loading ? 'Running model…' : 'Run Model'}</span>
                    <span className="cta__spark" aria-hidden="true" />
                  </button>

                  {loading && (
                    <div className="run-progress" aria-label="Run progress">
                      <div className="run-progress__bar">
                        <div className="run-progress__fill" style={{ width: `${runProgress}%` }} />
                      </div>
                      <div className="run-progress__text">
                        Live tab opened • processing…
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </section>

          <aside className="landing-right">
            <div className="glass-panel">
              <div className="panel-title">
                <span aria-hidden="true">📊</span>
                Results preview
              </div>

              {!loading && !result && (
                <div className="panel-placeholder">
                  <div className="shimmer" aria-hidden="true" />
                  <div className="placeholder-center">
                    <div className="placeholder-title">Optimization results will show here</div>
                    <div className="placeholder-sub">🚦🚦🚦🚦</div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="panel-loading">
                  <div className="modern-loader" aria-hidden="true" />
                  <div className="panel-loading__text">Analyzing videos… this can take a few minutes.</div>
                </div>
              )}

              {result && result.error && (
                <div className="panel-error">
                  <div className="panel-error__title">Error</div>
                  <div className="panel-error__msg">{result.error}</div>
                </div>
              )}

              {result && !result.error && (
                <div className="panel-results">
                  <div className="panel-results__grid">
                    {[
                      { k: 'North', c: result.counts?.[0], t: result.optimization?.north },
                      { k: 'South', c: result.counts?.[1], t: result.optimization?.south },
                      { k: 'West', c: result.counts?.[2], t: result.optimization?.west },
                      { k: 'East', c: result.counts?.[3], t: result.optimization?.east },
                    ].map((row) => (
                      <div key={row.k} className="mini-card">
                        <div className="mini-card__top">
                          <div className="mini-card__k">{row.k}</div>
                          <div className="mini-pill">Optimized</div>
                        </div>
                        <div className="mini-card__row">
                          <span className="mini-label">Vehicles</span>
                          <span className="mini-value accent">{formatNumber(row.c)}</span>
                        </div>
                        <div className="mini-card__row">
                          <span className="mini-label">Timing (sec)</span>
                          <span className="mini-value">{formatNumber(row.t)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/live" element={<Live />} />
      </Routes>
    </Router>
  );
}

export default App;
