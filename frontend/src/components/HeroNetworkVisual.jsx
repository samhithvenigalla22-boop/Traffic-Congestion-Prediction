import { Compass, MapPin, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { DEFAULT_LOCATION } from '../config/locations';

export default function HeroNetworkVisual({
  activeVolume = 3200,
  congestionLevel = 'MODERATE',
  selectedLocation = DEFAULT_LOCATION,
  onOpenLocationPicker = () => {},
}) {
  const statusColors = {
    LOW: { color: '#059669', bg: '#ecfdf5', text: 'LOW CONGESTION (FREE FLOW)' },
    MODERATE: { color: '#d97706', bg: '#fffbeb', text: 'MODERATE CONGESTION (STEADY FLOW)' },
    HIGH: { color: '#dc2626', bg: '#fef2f2', text: 'HIGH CONGESTION (PEAK DENSITY)' },
  };

  const status = statusColors[congestionLevel] || statusColors.MODERATE;
  const loc = selectedLocation || DEFAULT_LOCATION;

  const startNodeLabel = loc.name ? `${loc.name} Area` : 'Selected Area';
  const midNodeLabel = 'Traffic Zone (Prediction Point)';
  const endNodeLabel = 'Destination Corridor';

  const nodes = [
    {
      id: 'NODE-START',
      x: 180,
      y: 110,
      label: startNodeLabel,
      sublabel: 'Corridor Inbound',
      isCenter: false,
    },
    {
      id: 'NODE-PREDICT',
      x: 450,
      y: 80,
      label: midNodeLabel,
      sublabel: `${Math.round(activeVolume).toLocaleString()} veh/hr`,
      isCenter: true,
    },
    {
      id: 'NODE-END',
      x: 720,
      y: 110,
      label: endNodeLabel,
      sublabel: 'Corridor Outbound',
      isCenter: false,
    },
  ];

  return (
    <div className="hero-network-card">
      <div className="network-header">
        <div className="network-title-group">
          <div className="location-pin-emblem">
            <MapPin size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="loc-display-title-row">
              <span className="loc-prefix-label">GEOGRAPHIC SCENARIO CONTEXT:</span>
              <h2 className="network-title">{loc.name}</h2>
              <span className="loc-coords-chip">
                {loc.latitude?.toFixed(4)}°, {loc.longitude?.toFixed(4)}°
              </span>
              <button
                type="button"
                className="btn-change-location-header"
                onClick={onOpenLocationPicker}
                title="Select another city or custom scenario"
              >
                <Compass size={13} />
                <span>Change Location</span>
              </button>
            </div>
            <p className="network-subtitle">
              {loc.displayName || `${loc.name} Scenario Corridor`} &bull; Historical Traffic Prediction Scenario
            </p>
          </div>
        </div>

        <div className="network-telemetry-pill" style={{ backgroundColor: status.bg, borderColor: status.color }}>
          <span className="telemetry-live-dot" style={{ backgroundColor: status.color }}></span>
          <span className="telemetry-live-text" style={{ color: status.color }}>
            STATUS: {status.text}
          </span>
        </div>
      </div>

      {/* Route Flow Breadcrumb Bar */}
      <div className="route-flow-breadcrumb">
        <span className="route-flow-label">Route Flow:</span>
        <span className="route-flow-node">{loc.name}</span>
        <ArrowRight size={13} className="route-flow-arrow" />
        <span className="route-flow-node">Corridor Inbound</span>
        <ArrowRight size={13} className="route-flow-arrow" />
        <span className="route-flow-node">Prediction Point</span>
        <ArrowRight size={13} className="route-flow-arrow" />
        <span className="route-flow-node">Corridor Outbound</span>
      </div>

      {/* Professional SVG Corridor Visualizer */}
      <div className="network-svg-viewport">
        <svg
          viewBox="0 0 900 210"
          className="network-canvas"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.4" />
            </linearGradient>

            <pattern id="subtleGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="rgba(0, 0, 0, 0.04)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="900" height="210" fill="url(#subtleGrid)" />

          {/* Secondary Feeder Tracks */}
          <path
            d="M 60 70 Q 180 50 450 80 T 840 70"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <path
            d="M 60 150 Q 220 160 450 80 T 840 150"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* Primary Arterial Track */}
          <path
            d="M 60 110 C 200 110, 300 80, 450 80 C 600 80, 700 110, 840 110"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Dynamic Active Corridor Highlight */}
          <path
            d="M 60 110 C 200 110, 300 80, 450 80 C 600 80, 700 110, 840 110"
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Nodes */}
          {nodes.map((node) => (
            <g key={node.id} className="corridor-node-group">
              {/* Outer boundary */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.isCenter ? 32 : 22}
                fill={node.isCenter ? '#ffffff' : '#f8fafc'}
                stroke={node.isCenter ? status.color : '#64748b'}
                strokeWidth={node.isCenter ? 3 : 2}
              />

              {/* Node Center */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.isCenter ? 12 : 7}
                fill={node.isCenter ? status.color : '#94a3b8'}
              />

              {/* Label */}
              <text
                x={node.x}
                y={node.y + (node.isCenter ? 48 : 38)}
                textAnchor="middle"
                fill="#0f172a"
                fontSize={node.isCenter ? '12px' : '11px'}
                fontWeight={node.isCenter ? '700' : '600'}
              >
                {node.label}
              </text>

              {/* Sublabel */}
              <text
                x={node.x}
                y={node.y + (node.isCenter ? 62 : 51)}
                textAnchor="middle"
                fill={node.isCenter ? status.color : '#64748b'}
                fontSize="10px"
                fontWeight={node.isCenter ? '700' : '500'}
              >
                {node.sublabel}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Honest Technical Metadata Footer */}
      <div className="network-footer-specs">
        <div className="network-spec-item">
          <MapPin size={14} className="text-blue-600" />
          <div>
            <span className="spec-label">SELECTED LOCATION</span>
            <span className="spec-value">{loc.name}</span>
          </div>
        </div>

        <div className="network-spec-item">
          <Layers size={14} className="text-blue-600" />
          <div>
            <span className="spec-label">COORDINATES</span>
            <span className="spec-value">
              {loc.latitude?.toFixed(4)}°, {loc.longitude?.toFixed(4)}°
            </span>
          </div>
        </div>

        <div className="network-spec-item">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <div>
            <span className="spec-label">MODEL INFERENCE</span>
            <span className="spec-value">In-Browser XGBoost (200 Trees)</span>
          </div>
        </div>

        <div className="network-spec-item">
          <Layers size={14} className="text-blue-600" />
          <div>
            <span className="spec-label">MODEL FIT (VARIANCE)</span>
            <span className="spec-value">0.95 R² on Test Data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
