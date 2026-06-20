import React from 'react';

// --- PİYON TERFİ MODALI ---
interface PromotionModalProps {
  isOpen: boolean;
  sira: string;
  onSelect: (type: string) => void;
  images: { vezir: string, kale: string, fil: string, at: string };
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onSelect, images }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content promotion-modal">
        <h3>Piyon Terfi!</h3>
        <div className="promotion-options">
          <img src={images.vezir} onClick={() => onSelect('vezir')} alt="Vezir" />
          <img src={images.kale} onClick={() => onSelect('kale')} alt="Kale" />
          <img src={images.fil} onClick={() => onSelect('fil')} alt="Fil" />
          <img src={images.at} onClick={() => onSelect('at')} alt="At" />
        </div>
      </div>
    </div>
  );
};

// --- OYUN BİTTİ MODALI ---
interface GameOverModalProps {
  oyunDurumu: string;
  sira: string;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ oyunDurumu, sira, onRestart }) => {
  if (oyunDurumu === 'devam') return null;

  const kazanan = sira === 'beyaz' ? 'SİYAH' : 'BEYAZ'; // Mat eden, sırası geçen değil, bir önceki oynayandır.

  return (
    <div className="modal-overlay">
      <div className="modal-content game-over-modal">
        {oyunDurumu === 'mat' ? (
           <>
             <h2 style={{color: '#e74c3c'}}>ŞAH MAT!</h2>
             <p>{kazanan} KAZANDI 🏆</p>
           </>
        ) : (
           <>
             <h2 style={{color: '#f1c40f'}}>OYUN BERABERE</h2>
             <p>(PAT Durumu)</p>
           </>
        )}
        <button className="restart-btn" onClick={onRestart}>Yeni Oyun</button>
      </div>
    </div>
  );
};

