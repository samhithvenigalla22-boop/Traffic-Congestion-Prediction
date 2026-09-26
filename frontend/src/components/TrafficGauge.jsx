import React from 'react';
import { motion } from 'framer-motion';

export default function TrafficGauge({ volume = 0, congestionLevel = 'MODERATE', maxVolume = 7500 }) {
  const clampedVol = Math.max(0, Math.min(maxVolume, volume));
  const percentage = Math.round((clampedVol / maxVolume) * 100);

  // Speedometer angle from -135deg (0%) to +135deg (100%) -> 270 deg span
  const angle = -135 + (clampedVol / maxVolume) * 270;

  const colors = {
    LOW: { primary: '#059669', bg: '#ecfdf5', text: 'Low Congestion' },
    MODERATE: { primary: '#d97706', bg: '#fffbeb', text: 'Moderate Density' },
    HIGH: { primary: '#dc2626', bg: '#fef2f2', text: 'High Congestion' },
  };

  const activeColor = colors[congestionLevel] || colors.MODERATE;

  const size = 260;
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const progressOffset = arcLength - (arcLength * clampedVol) / maxVolume;

  return (
    <div className="traffic-gauge-container">
      <div className="gauge-relative-wrapper">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="gauge-svg"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="45%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* Background Track (270 degrees) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />

          {/* Dynamic Fill Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: progressOffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />

          {/* Needle Pointer */}
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <motion.g
              initial={{ rotate: -135 }}
              animate={{ rotate: angle }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={-radius + 14}
                stroke={activeColor.primary}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="0" cy="0" r="7" fill={activeColor.primary} />
              <circle cx="0" cy="0" r="3" fill="#ffffff" />
            </motion.g>
          </g>
        </svg>

        {/* Center Gauge Digital Readout */}
        <div className="gauge-center-readout">
          <span className="gauge-sub-label">VOLUME SCALE</span>
          <span className="gauge-primary-value" style={{ color: activeColor.primary }}>
            {percentage}%
          </span>
          <span className="gauge-capacity-subtext">of 7,500 veh/hr max</span>
        </div>
      </div>

      {/* Threshold Indicators */}
      <div className="gauge-threshold-legend">
        <div className="legend-segment seg-low">
          <span className="legend-dot dot-low"></span>
          <span>&lt; 2,154 Low</span>
        </div>
        <div className="legend-segment seg-mod">
          <span className="legend-dot dot-mod"></span>
          <span>2,154–4,555 Mod</span>
        </div>
        <div className="legend-segment seg-high">
          <span className="legend-dot dot-high"></span>
          <span>&gt; 4,555 High</span>
        </div>
      </div>
    </div>
  );
}
