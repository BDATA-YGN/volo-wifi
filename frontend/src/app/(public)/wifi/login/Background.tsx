"use client";

import React, { useEffect, useState } from "react";

type ShipType = "cargo" | "tanker" | "sailboat";

interface Ship {
  id: number;
  type: ShipType;
  size: number;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  direction: number;
}

interface BackgroundProps {
  theme: "light" | "dark";
}

const Background: React.FC<BackgroundProps> = ({ theme }) => {
  const [ships, setShips] = useState<Ship[]>([]);

  useEffect(() => {
    const shipTypes: ShipType[] = ["cargo", "tanker", "sailboat"];
    const newShips: Ship[] = [];

    for (let i = 0; i < 8; i++) {
      newShips.push({
        id: i,
        type: shipTypes[Math.floor(Math.random() * shipTypes.length)],
        size: 30 + Math.random() * 60,
        x: Math.random() * 100,
        y: 65,
        speed: 0.2 + Math.random() * 1.5,
        opacity: 0.3 + Math.random() * 0.4,
        direction: Math.random() > 0.5 ? 1 : -1,
      });
    }

    setShips(newShips);

    const interval = setInterval(() => {
      setShips((prevShips) =>
        prevShips.map((ship) => ({
          ...ship,
          x: (ship.x + 0.1 * ship.speed * ship.direction + 100) % 100,
          y: (ship.y + 0.02 * ship.speed * (Math.random() > 0.5 ? 1 : -1) + 100) % 100,
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const renderShip = (type: ShipType, rotation: number, color: string) => {
    switch (type) {
      case "cargo":
        return (
          <svg viewBox="0 0 100 40">
            <rect x="20" y="15" width="60" height="20" fill={color} />
            <polygon points="80,15 95,15 80,35" fill={color} />
            <polygon points="20,15 5,15 20,35" fill={color} />
            <rect x="25" y="5" width="40" height="10" fill={color} />
          </svg>
        );
      case "tanker":
        return (
          <svg viewBox="0 0 100 40">
            <rect x="15" y="15" width="70" height="15" rx="5" fill={color} />
            <polygon points="85,15 95,20 85,30" fill={color} />
            <polygon points="15,15 5,20 15,30" fill={color} />
            <circle cx="30" cy="15" r="5" fill={color} />
            <circle cx="50" cy="15" r="5" fill={color} />
            <circle cx="70" cy="15" r="5" fill={color} />
          </svg>
        );
      case "sailboat":
        return (
          <svg viewBox="0 0 100 60">
            <polygon points="40,50 60,50 55,30 45,30" fill={color} />
            <polygon points="50,10 50,40 75,40" fill={color} />
            <polygon points="50,25 50,45 25,45" fill={color} />
            <line x1="50" y1="10" x2="50" y2="50" stroke={color} strokeWidth="2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {ships.map((ship) => (
          <div
            key={ship.id}
            className="absolute"
            style={{
              width: `${ship.size}px`,
              height: `${ship.size * 0.6}px`,
              left: `${ship.x}%`,
              top: `${ship.y}%`,
              opacity: ship.opacity,
              transition: "left 1s linear, top 1s linear",
            }}
          >
            {renderShip(ship.type, ship.direction > 0 ? 0 : 180, theme === "dark" ? "#3949AB" : "#2196F3")}
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1/3">
        <div className={`absolute inset-0 ${theme === "dark" ? "bg-blue-900/20" : "bg-blue-400/10"}`} />
      </div>

      <div className="absolute inset-0">
        {theme === "dark" ? (
          <>
            <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-blue-900 opacity-20 blur-3xl" />
            <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-indigo-900 opacity-20 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-yellow-200 opacity-20 blur-3xl" />
            <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-blue-200 opacity-20 blur-3xl" />
          </>
        )}
      </div>

      <style jsx>{`
        .wave-animation {
          position: absolute;
          width: 200%;
          height: 100%;
          background: ${theme === "dark" ? "rgba(30, 64, 175, 0.2)" : "rgba(59, 130, 246, 0.1)"};
          border-radius: 50%;
          left: -50%;
          animation: wave 8s infinite linear;
        }

        @keyframes wave {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(-10%) rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

Background.displayName = "Background";

export default Background;
