export default function TrafficRoadAnimation() {
  return (
    <div className="traffic-road-animation-container" aria-hidden="true">
      <svg
        className="traffic-road-svg"
        viewBox="0 0 400 600"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Road Surface */}
        <rect x="50" y="0" width="300" height="600" fill="#1E293B" />
        
        {/* Road Shoulders */}
        <line x1="50" y1="0" x2="50" y2="600" stroke="#475569" strokeWidth="4" />
        <line x1="350" y1="0" x2="350" y2="600" stroke="#475569" strokeWidth="4" />

        {/* Lane Dividers (Dashed Animated Lines) */}
        <line
          x1="150"
          y1="0"
          x2="150"
          y2="600"
          stroke="#94A3B8"
          strokeWidth="3"
          strokeDasharray="20 20"
          className="road-lane-anim"
        />
        <line
          x1="250"
          y1="0"
          x2="250"
          y2="600"
          stroke="#94A3B8"
          strokeWidth="3"
          strokeDasharray="20 20"
          className="road-lane-anim"
        />

        {/* Ambient Moving Vehicles */}
        {/* Lane 1 Vehicle */}
        <g className="vehicle-anim-lane1">
          <rect x="85" y="0" width="30" height="50" rx="6" fill="#3B82F6" />
          <rect x="90" y="10" width="20" height="12" rx="2" fill="#DBEAFE" />
          <circle cx="92" cy="4" r="3" fill="#FEF08A" />
          <circle cx="108" cy="4" r="3" fill="#FEF08A" />
          <circle cx="92" cy="46" r="3" fill="#EF4444" />
          <circle cx="108" cy="46" r="3" fill="#EF4444" />
        </g>

        {/* Lane 2 Vehicle */}
        <g className="vehicle-anim-lane2">
          <rect x="185" y="0" width="30" height="54" rx="6" fill="#F59E0B" />
          <rect x="190" y="12" width="20" height="14" rx="2" fill="#FEF3C7" />
          <circle cx="192" cy="4" r="3" fill="#FEF08A" />
          <circle cx="208" cy="4" r="3" fill="#FEF08A" />
          <circle cx="192" cy="50" r="3" fill="#EF4444" />
          <circle cx="208" cy="50" r="3" fill="#EF4444" />
        </g>

        {/* Lane 3 Vehicle */}
        <g className="vehicle-anim-lane3">
          <rect x="285" y="0" width="30" height="48" rx="6" fill="#10B981" />
          <rect x="290" y="10" width="20" height="12" rx="2" fill="#D1FAE5" />
          <circle cx="292" cy="4" r="3" fill="#FEF08A" />
          <circle cx="308" cy="4" r="3" fill="#FEF08A" />
          <circle cx="292" cy="44" r="3" fill="#EF4444" />
          <circle cx="308" cy="44" r="3" fill="#EF4444" />
        </g>
      </svg>
    </div>
  );
}
