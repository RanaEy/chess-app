import React from 'react';
import { Tas } from '../types';

interface CapturedZoneProps {
  title: string;
  pieces: Tas[];
}

const CapturedZone: React.FC<CapturedZoneProps> = ({ title, pieces }) => {
  return (
    <div className="captured-zone">
      <div className="zone-title">{title}</div>
      <div className="captured-pieces">
        {pieces.map((p, idx) => (
          <img key={idx} src={p.img} alt={p.id} className="captured-piece-img" />
        ))}
        {pieces.length === 0 && <span style={{fontSize: '12px', color: '#ccc', fontStyle: 'italic'}}>Henüz taş yok</span>}
      </div>
    </div>
  );
};

export default CapturedZone;