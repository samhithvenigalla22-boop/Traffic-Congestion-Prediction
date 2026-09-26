import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Info } from 'lucide-react';
import { getModelPerformance } from '../ml/modelAdapter';

export default function ModelInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const info = getModelPerformance();
  const { n_trees } = info;

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-title-group">
              <div className="modal-icon-badge">
                <Cpu size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="modal-title">XGBoost Production Regressor Architecture</h3>
                <span className="modal-subtitle">Strict Chronological Holdout Benchmarking (7,229 Test Rows)</span>
              </div>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <div className="modal-body">
            {/* Highlight Cards */}
            <div className="benchmark-cards-grid">
              <div className="stat-card">
                <span className="stat-label">DEPLOYED MODEL</span>
                <span className="stat-value text-cyan">XGBoost Regressor</span>
                <span className="stat-sub">{n_trees} Gradient-Boosted Decision Trees</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">HELD-OUT TEST R&sup2;</span>
                <span className="stat-value text-emerald">0.95</span>
                <span className="stat-sub">95% variance explained on unseen future test set</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">MEAN ABSOLUTE ERROR</span>
                <span className="stat-value text-amber">282.44</span>
                <span className="stat-sub">veh/hr average absolute deviation</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">ROOT MEAN SQUARED ERROR</span>
                <span className="stat-value text-purple">458.60</span>
                <span className="stat-sub">veh/hr test set metric penalizing spikes</span>
              </div>
            </div>

            {/* Split Details & Feature Engineering */}
            <div className="modal-split-box">
              <h4 className="modal-section-title">Strict Chronological Partition (No Lookahead Bias)</h4>
              <p className="modal-text">
                Evaluated on 48,187 hourly records from the Interstate 94 metropolitan corridor. Chronological ordering ensures the model predicts true future time steps rather than interpolating between randomly shuffled hours:
              </p>
              <div className="modal-split-stats">
                <div className="split-stat-item">
                  <span className="split-stat-title">Training Set</span>
                  <span className="split-stat-val">33,730 hours (70%)</span>
                </div>
                <div className="split-stat-item">
                  <span className="split-stat-title">Validation Set</span>
                  <span className="split-stat-val">7,228 hours (15%)</span>
                </div>
                <div className="split-stat-item">
                  <span className="split-stat-title">Held-Out Test Set</span>
                  <span className="split-stat-val">7,229 hours (15%)</span>
                </div>
              </div>
            </div>

            {/* Congestion Threshold Definitions */}
            <div className="modal-threshold-box">
              <h4 className="modal-section-title">Empirical Tercile Congestion Thresholds</h4>
              <div className="threshold-pills-row">
                <div className="threshold-pill pill-low">
                  <span className="pill-dot"></span>
                  <strong>LOW:</strong> &lt; 2,154 veh/hr (Free-flow off-peak)
                </div>
                <div className="threshold-pill pill-mod">
                  <span className="pill-dot"></span>
                  <strong>MODERATE:</strong> 2,154 - 4,555 veh/hr (Standard daytime flow)
                </div>
                <div className="threshold-pill pill-high">
                  <span className="pill-dot"></span>
                  <strong>HIGH:</strong> &gt; 4,555 veh/hr (Rush-hour capacity constraint)
                </div>
              </div>
            </div>

            <div className="modal-footer-note">
              <Info size={14} className="text-cyan-400" />
              <span>
                Engineered features include cyclical hour, day-of-week, and month harmonics (sin/cos), rush-hour indicator flags, surface temperature, precipitation rates, cloud density, and calendar holiday indicators.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
