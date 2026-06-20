import React, { useEffect, useRef } from 'react';
import { MoveRecord } from '../types';

interface MoveListProps {
  history: MoveRecord[];
  currentIndex: number;
  onJump: (index: number) => void;
}

const MoveList: React.FC<MoveListProps> = ({ history, currentIndex, onJump }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll Sorunu Çözümü:
    // Sayfayı değil, sadece listenin içindeki çubuğu en aşağı indirir.
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [history]);

  // Hamleleri "1. e4 e5" formatında ikili gruplara ayırma
  const movesToRender = [];
  for (let i = 1; i < history.length; i += 2) {
    movesToRender.push({
      moveNumber: Math.ceil(i / 2),
      white: history[i],
      black: history[i + 1] || null, 
      whiteIndex: i,
      blackIndex: i + 1
    });
  }

  return (
    <div className="move-list-container">
      <div className="move-list-header">Hamle Geçmişi</div>
      <div className="move-list-content" ref={listRef}>
        {movesToRender.map((round, idx) => (
          <div key={idx} className="move-row">
            <span className="move-number">{round.moveNumber}.</span>
            {/* Beyaz Hamlesi */}
            <span 
              className={`move-text ${currentIndex === round.whiteIndex ? 'active-move' : ''}`}
              onClick={() => onJump(round.whiteIndex)}
            >
              {round.white.notation}
            </span>
            {/* Siyah Hamlesi */}
            {round.black && (
              <span 
                className={`move-text ${currentIndex === round.blackIndex ? 'active-move' : ''}`}
                onClick={() => onJump(round.blackIndex)}
              >
                {round.black.notation}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoveList;