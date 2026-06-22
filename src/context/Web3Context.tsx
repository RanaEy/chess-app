import React, { createContext, useState, useContext, useEffect } from 'react';

interface Web3ContextType {
  account: string | null;
  balance: number; // Kullanıcının oyun içi puanı
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getDailyPoints: () => void; // Ücretsiz günlük puan alma fonksiyonu
  harcaPuan: (miktar: number) => boolean; // Maça girerken puan düşme
  kazanPuan: (miktar: number) => void; // Yenince puan ekleme
  loading: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // --- PUANLARI HESABA GÖRE KAYDETME VE YÜKLEME ---

  // 1. Oyuncu cüzdanı bağladığında eski puanını tarayıcıdan çek
  useEffect(() => {
    if (account) {
      const kaydedilenPuan = localStorage.getItem(`puan_${account}`);
      if (kaydedilenPuan) {
        // Tarayıcıdaki veriyi (string) sayıya (number) çevirip state'e yaz
        setBalance(parseInt(kaydedilenPuan, 10));
      } else {
        // Bu hesaba ait kayıt yoksa 0'dan başlasın (veya başlangıç hediyesi vermek istersen 0'ı değiştirebilirsin)
        setBalance(0); 
      }
    } else {
      // Cüzdan bağlantısı kesildiğinde ekranda başkasının puanı kalmasın
      setBalance(0);
    }
  }, [account]);

  // 2. Oyuncunun puanı her değiştiğinde (harcama veya kazanma) bunu anında tarayıcıya kaydet
  useEffect(() => {
    if (account) {
      localStorage.setItem(`puan_${account}`, balance.toString());
    }
  }, [balance, account]);

  // Cüzdan bağlandığında yerel hafızadan (localStorage) bu cüzdanın puanını çekiyoruz
  useEffect(() => {
    if (account) {
      const kayıtlıBakiye = localStorage.getItem(`bakiye_${account}`);
      if (kayıtlıBakiye) {
        setBalance(parseInt(kayıtlıBakiye));
      } else {
        // Yeni oyuncuya ilk girişte 100 Ücretsiz Puan hediye
        setBalance(100);
        localStorage.setItem(`bakiye_${account}`, "100");
      }
    } else {
      setBalance(0);
    }
  }, [account]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Lütfen MetaMask veya uyumlu bir Web3 cüzdanı yükleyin!");
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (error) {
      console.error("Bağlantı hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  // Ücretsiz Günlük Puan Dağıtan Fonksiyon (Dışarıdan satın almayı engeller)
  const getDailyPoints = () => {
    if (!account) return;
    const yeniBakiye = balance + 20; // 20 puan harçlık
    setBalance(yeniBakiye);
    localStorage.setItem(`bakiye_${account}`, yeniBakiye.toString());
    alert("Günlük 20 Oyun Puanı cüzdanınıza eklendi!");
  };

  // Maça giriş ücreti
  const harcaPuan = (miktar: number): boolean => {
    if (balance < miktar) {
      alert("Yetersiz Oyun Puanı! Lütfen günlük harçlığınızı alın.");
      return false;
    }
    const yeniBakiye = balance - miktar;
    setBalance(yeniBakiye);
    if (account) localStorage.setItem(`bakiye_${account}`, yeniBakiye.toString());
    return true;
  };

  // Maç kazanma ödülü
  const kazanPuan = (miktar: number) => {
    const yeniBakiye = balance + miktar;
    setBalance(yeniBakiye);
    if (account) localStorage.setItem(`bakiye_${account}`, yeniBakiye.toString());
  };

  return (
    <Web3Context.Provider value={{ account, balance, connectWallet, disconnectWallet, getDailyPoints, harcaPuan, kazanPuan, loading }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3, Web3Provider içinde kullanılmalıdır.");
  return context;
};