// Anastra - Kurallar, kurulum ve el/oyun sonu modalleri
import type { ReactNode } from 'react';
import type { GameState } from '../game/types';

interface RulesModalProps {
  onClose: () => void;
}

type Suit = '♠' | '♥' | '♦' | '♣';

function MiniCard({
  rank,
  suit,
  dim = false,
}: {
  rank: string;
  suit: Suit;
  dim?: boolean;
}) {
  const red = suit === '♥' || suit === '♦';

  return (
    <span
      className={[
        'inline-flex h-12 w-8 shrink-0 flex-col items-center justify-center rounded-md border border-black/20 bg-white font-black shadow-sm',
        red ? 'text-red-600' : 'text-slate-900',
        dim ? 'opacity-35 grayscale' : '',
      ].join(' ')}
    >
      <span className="text-sm leading-none">{rank}</span>
      <span className="text-base leading-none">{suit}</span>
    </span>
  );
}

function Arrow() {
  return (
    <span className="px-1 text-xl font-black text-amber-300" aria-hidden="true">
      →
    </span>
  );
}

function SectionTitle({
  number,
  title,
  subtitle,
}: {
  number: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-base font-black text-slate-950 shadow-lg shadow-amber-500/10">
        {number}
      </div>
      <div>
        <h3 className="text-base font-black text-amber-200 md:text-lg">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-white/55 md:text-sm">{subtitle}</p>}
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-black text-sky-200">
          {step}
        </span>
        <strong className="text-sm text-white">{title}</strong>
      </div>
      <div className="text-xs leading-5 text-white/70">{children}</div>
    </div>
  );
}

function RuleBox({
  title,
  children,
  tone = 'amber',
}: {
  title: string;
  children: ReactNode;
  tone?: 'amber' | 'sky' | 'emerald' | 'rose';
}) {
  const tones = {
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    sky: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="mb-1 text-xs font-black uppercase tracking-wide">{title}</div>
      <div className="text-xs leading-5 text-white/75">{children}</div>
    </div>
  );
}

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-amber-300/20 bg-slate-950 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur md:px-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/70">
              ANASTRA
            </div>
            <h2 className="text-xl font-black text-amber-300 md:text-2xl">Nasıl Oynanır?</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Kuralları kapat"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[82vh] space-y-5 overflow-y-auto p-4 md:p-6">
          <section className="rounded-2xl border border-amber-300/15 bg-gradient-to-br from-emerald-950/70 to-slate-950 p-4 md:p-5">
            <SectionTitle
              number={1}
              title="Oyunun amacı ve temel akış"
              subtitle="4 oyuncu, 2 takım, 2 deste iskambil ve jokersiz oyun."
            />

            <div className="grid gap-3 md:grid-cols-3">
              <RuleBox title="Takımlar" tone="sky">
                Sen ve karşındaki <b>Ortak</b> aynı takımdasınız. Diğer iki oyuncu rakip takımdır.
              </RuleBox>
              <RuleBox title="Başlangıç" tone="emerald">
                Her oyuncuya <b>13 kart</b> dağıtılır. Kalan kartlar kapalı desteyi oluşturur.
              </RuleBox>
              <RuleBox title="Tur" tone="amber">
                Sıranda önce kart alırsın; ardından per açabilir/işleyebilir ve son olarak bir kart atarsın.
              </RuleBox>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-300/20 bg-gradient-to-b from-emerald-950/50 to-slate-950 p-4 md:p-5">
            <SectionTitle
              number={2}
              title="İlk 51 nasıl açılır?"
              subtitle="Anastra'da açılış perleri tek tek hazırlanır, sonra birlikte masaya açılır."
            />

            <RuleBox title="En önemli fark" tone="amber">
              <b>Per Ekle</b> kartları hemen masaya açmaz; onları açılış hazırlığına ekler. Hazırladığın perlerin toplamı en az <b>51</b> olduğunda <b>Eli Aç</b> ile hepsini birlikte masaya açarsın.
            </RuleBox>

            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <StepCard step={1} title="İlk perini seç">
                <div className="mb-2 flex items-center justify-center gap-1">
                  <MiniCard rank="7" suit="♥" />
                  <MiniCard rank="8" suit="♥" />
                  <MiniCard rank="9" suit="♥" />
                </div>
                Geçerli bir seri veya set oluşturacak en az 3 kartı seç.
              </StepCard>

              <StepCard step={2} title="Per Ekle'ye bas">
                <div className="mb-2 rounded-lg bg-sky-500/15 px-3 py-2 text-center font-bold text-sky-200">
                  PER EKLE · 24p
                </div>
                İlk per açılış hazırlığına geçer. Elindeki diğer kartlar elinde kalır.
              </StepCard>

              <StepCard step={3} title="İkinci peri hazırla">
                <div className="mb-2 flex items-center justify-center gap-1">
                  <MiniCard rank="10" suit="♣" />
                  <MiniCard rank="10" suit="♦" />
                  <MiniCard rank="10" suit="♠" />
                </div>
                Yeni kartları seçip tekrar <b>Per Ekle</b>'ye bas. Gerekirse üçüncü veya daha fazla per de ekleyebilirsin.
              </StepCard>

              <StepCard step={4} title="51+ olduğunda Eli Aç">
                <div className="mb-2 rounded-lg border border-emerald-400/30 bg-emerald-500/15 p-2 text-center">
                  <div className="text-[11px] text-white/55">Açılış Toplamı</div>
                  <div className="text-2xl font-black text-emerald-300">54 ✓</div>
                  <div className="mt-1 rounded-md bg-emerald-500 px-2 py-1 font-black text-slate-950">ELİ AÇ</div>
                </div>
                <b>Eli Aç</b> düğmesiyle hazırladığın perlerin tamamı tek seferde masaya açılır.
              </StepCard>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <RuleBox title="Puanlar" tone="sky">
                Sayı kartları kendi değeri; <b>J/Q/K = 10</b>, <b>A = 11</b> puandır.
              </RuleBox>
              <RuleBox title="Per başına" tone="emerald">
                Her per en az <b>3 karttan</b> oluşur.
              </RuleBox>
              <RuleBox title="Son kart" tone="rose">
                Bütün kartlarını per açarak veya işleyerek tüketemezsin. <b>Atmak için en az 1 kart</b> elde kalmalıdır.
              </RuleBox>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <SectionTitle number={3} title="Per türleri" />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 text-sm font-black text-sky-200">SERİ · aynı tür, ardışık</div>
                <div className="mb-3 flex items-center gap-1">
                  <MiniCard rank="Q" suit="♠" />
                  <MiniCard rank="K" suit="♠" />
                  <MiniCard rank="A" suit="♠" />
                  <span className="ml-2 text-emerald-300">✓ Geçerli</span>
                </div>
                <div className="flex items-center gap-1">
                  <MiniCard rank="A" suit="♥" />
                  <MiniCard rank="2" suit="♥" />
                  <MiniCard rank="3" suit="♥" />
                  <span className="ml-2 text-rose-300">✕ Geçersiz</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/60">
                  As yalnızca yüksek kullanılır. Bu yüzden <b>Q-K-A</b> geçerlidir; <b>A-2-3</b> ve <b>K-A-2</b> geçerli değildir.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 text-sm font-black text-amber-200">SET · aynı değer, farklı tür</div>
                <div className="mb-3 flex items-center gap-1">
                  <MiniCard rank="8" suit="♠" />
                  <MiniCard rank="8" suit="♥" />
                  <MiniCard rank="8" suit="♦" />
                  <span className="ml-2 text-emerald-300">✓ Açık set</span>
                </div>
                <div className="flex items-center gap-1">
                  <MiniCard rank="8" suit="♠" />
                  <MiniCard rank="8" suit="♥" />
                  <MiniCard rank="8" suit="♦" />
                  <MiniCard rank="8" suit="♣" />
                  <span className="ml-2 text-amber-300">🔒 Kapanır</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/60">
                  Aynı değerde dört farklı tür tamamlanınca set otomatik olarak kapanır.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <SectionTitle
              number={4}
              title="Yerden kart alma"
              subtitle="Elini açıp açmadığına göre yerden kart alma kuralı değişir."
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <RuleBox title="Elini henüz açmadıysan" tone="rose">
                Yerden yalnızca <b>en üstteki / son atılan kartı</b> alabilirsin. Aldığın bu kartı aynı turda <b>51'lik açılışın içinde kullanman gerekir</b>. Bunu yapamazsan yerden alma işlemini iptal edebilirsin.
              </RuleBox>

              <RuleBox title="Elini açtıysan" tone="emerald">
                Yerde daha geride duran bir kartı seçebilirsin. Seçtiğin karttan itibaren üstündeki kartları da alırsın. Seçtiğin ilk kartı o turda <b>yeni bir perde veya masadaki uygun bir pere işleyerek</b> kullanman gerekir.
              </RuleBox>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs font-bold text-white/60">Örnek · elini açmış oyuncu</div>
              <div className="flex flex-wrap items-center justify-center gap-1">
                <MiniCard rank="3" suit="♣" dim />
                <MiniCard rank="J" suit="♦" dim />
                <MiniCard rank="6" suit="♠" />
                <MiniCard rank="4" suit="♥" />
                <MiniCard rank="7" suit="♦" />
                <MiniCard rank="9" suit="♥" />
                <Arrow />
                <span className="max-w-xs text-xs leading-5 text-white/70">
                  <b>6♠</b>'yı seçersen 6♠ ve onun üstündeki kartlar eline gelir; 6♠ kullanılmak zorundadır.
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-300/15 bg-gradient-to-br from-slate-950 to-emerald-950/40 p-4 md:p-5">
            <SectionTitle
              number={5}
              title="Masadaki perlere kart işleme"
              subtitle="Kendi takımının perine işleme ile rakibin perine işleme aynı sonucu doğurmaz."
            />

            <div className="grid gap-3 lg:grid-cols-3">
              <RuleBox title="Kendi takımının peri" tone="sky">
                Uygun kartı kendi takımının perine eklersin. Serilerde yalnızca <b>uçlardan</b> işleme yapılır. Setlerde eksik olan uygun tür tamamlanabilir.
              </RuleBox>

              <RuleBox title="Rakibin setine 4. kart" tone="rose">
                Rakibin 3 kartlık setini dördüncü kartla tamamlarsan <b>set kapanır</b>. Rakibin asıl peri rakipte kalır; senin işlediğin kart ise <b>senin takımının puan alanına</b> gider.
              </RuleBox>

              <RuleBox title="Rakibin serisine uçtan" tone="amber">
                Yeni kart seride kalır; onun yanındaki <b>eski uç kart</b> seriden çıkar ve senin takımının puan alanına gider. Seri açık kalır.
              </RuleBox>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-rose-300/20 bg-black/25 p-3">
                <div className="mb-3 text-sm font-black text-rose-200">A · Rakibin setini kapatma</div>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  <MiniCard rank="8" suit="♥" />
                  <MiniCard rank="8" suit="♦" />
                  <MiniCard rank="8" suit="♣" />
                  <span className="px-2 text-white/40">+</span>
                  <MiniCard rank="8" suit="♠" />
                  <Arrow />
                  <span className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">SET KAPANIR 🔒</span>
                  <Arrow />
                  <span className="text-xs text-white/70">8♠ senin puan alanına gider.</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-300/20 bg-black/25 p-3">
                <div className="mb-3 text-sm font-black text-amber-200">B · Rakibin serisine uçtan işleme</div>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  <MiniCard rank="7" suit="♥" />
                  <MiniCard rank="8" suit="♥" />
                  <MiniCard rank="9" suit="♥" />
                  <span className="px-2 text-white/40">+</span>
                  <MiniCard rank="10" suit="♥" />
                  <Arrow />
                  <MiniCard rank="7" suit="♥" />
                  <MiniCard rank="8" suit="♥" />
                  <MiniCard rank="10" suit="♥" />
                  <span className="px-1 text-white/40">+</span>
                  <span className="text-xs text-amber-200">9♥ → senin puan alanın</span>
                </div>
                <p className="mt-3 text-center text-xs text-white/55">Yeni kart seride kalır, eski uç kart senin olur; seri açık kalır.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <SectionTitle number={6} title="Kart seçme, Per Ekle ve Sırala" />
            <div className="grid gap-3 md:grid-cols-3">
              <StepCard step={1} title="Kart seç">
                Bir karta dokunarak seçebilir veya seçimini kaldırabilirsin. Birden fazla kart seçerek geçerli per oluşturursun.
              </StepCard>
              <StepCard step={2} title="Per Ekle / Yeni Per Aç">
                İlk açılışta <b>Per Ekle</b>, açıldıktan sonra geçerli kart grubu için <b>Yeni Per Aç</b> kullanılır.
              </StepCard>
              <StepCard step={3} title="Sırala">
                Kartları sürükleyerek istediğin sıraya taşıyabilir veya <b>Sırala</b> düğmesiyle otomatik düzenleyebilirsin.
              </StepCard>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <SectionTitle number={7} title="Kart atma ve turu bitirme" />
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center">
              <div className="flex items-center justify-center gap-1 md:justify-start">
                <MiniCard rank="3" suit="♠" />
                <MiniCard rank="6" suit="♦" />
                <MiniCard rank="J" suit="♣" />
                <MiniCard rank="10" suit="♣" />
                <MiniCard rank="5" suit="♦" />
                <Arrow />
                <span className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-slate-950">KARTI AT</span>
              </div>
              <p className="text-xs leading-5 text-white/70">
                Yapmak istediğin işlemler bittikten sonra elinden <b>bir kart seç</b> ve <b>Kartı At</b> düğmesine bas. Kart atıldığında turun tamamlanır ve sıra sonraki oyuncuya geçer.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <SectionTitle number={8} title="Puanlama ve skor defteri" />
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-white/70">
                Açtığın perler ve oyun sırasında takımının kazandığı puan kartları skora katkı sağlar. Tur sonunda elde kalan kartlar oyuncular için eksi puan olarak değerlendirilir. Takımın tur ve toplam puanları oyun boyunca güncellenir.
              </div>

              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-rose-500/10 p-4">
                <div className="mb-3 text-center text-sm font-black text-white">SKOR DEFTERİ</div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="text-white/45">Takım</div>
                  <div className="text-white/45">Tur</div>
                  <div className="text-white/45">Toplam</div>
                  <div className="rounded bg-sky-500/20 py-1 text-sky-200">Biz</div>
                  <div className="rounded bg-sky-500/20 py-1">+84</div>
                  <div className="rounded bg-sky-500/20 py-1 font-black">348</div>
                  <div className="rounded bg-rose-500/20 py-1 text-rose-200">Rakip</div>
                  <div className="rounded bg-rose-500/20 py-1">+55</div>
                  <div className="rounded bg-rose-500/20 py-1 font-black">276</div>
                </div>
                <p className="mt-3 text-center text-xs text-white/55">
                  Oyun başında seçilen hedef: <b>751 / 1051 / 1251 / 1751</b>.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 md:p-5">
            <SectionTitle number={9} title="Hızlı özet" />
            <div className="grid gap-2 text-xs md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-black/20 p-3"><b className="text-amber-200">1.</b> Desteden veya yerden kart al.</div>
              <div className="rounded-lg bg-black/20 p-3"><b className="text-amber-200">2.</b> Per aç veya uygun pere kart işle.</div>
              <div className="rounded-lg bg-black/20 p-3"><b className="text-amber-200">3.</b> Son kartını seç ve Kartı At'a bas.</div>
              <div className="rounded-lg bg-black/20 p-3"><b className="text-amber-200">4.</b> Hedef puana ulaşana kadar eller devam eder.</div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <RuleBox title="Unutma" tone="amber">İlk açılış toplamı her zaman en az <b>51</b> olmalıdır.</RuleBox>
              <RuleBox title="Unutma" tone="rose">Yerden seçtiğin zorunlu kartı o turda kullanmalısın; gerekirse yerden alma işlemini iptal et.</RuleBox>
              <RuleBox title="Unutma" tone="emerald">Elinde turu bitirmek için atabileceğin en az <b>1 kart</b> kalmalıdır.</RuleBox>
            </div>
          </section>

          <button
            type="button"
            onClick={onClose}
            className="sticky bottom-0 w-full rounded-xl bg-amber-400 py-3 font-black text-slate-950 shadow-lg shadow-black/30 transition hover:bg-amber-300"
          >
            Anladım · Oyuna Dön
          </button>
        </div>
      </div>
    </Overlay>
  );
}

interface MainMenuModalProps {
  onNewGame: () => void;
  onShowRules: () => void;
  onShowSettings: () => void;
}

export function MainMenuModal({
  onNewGame,
  onShowRules,
  onShowSettings,
}: MainMenuModalProps) {
  return (
    <Overlay>
      <div className="w-full max-w-md rounded-3xl border border-amber-300/20 bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 p-6 text-center text-white shadow-2xl md:p-8">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/30 bg-amber-300/10 text-4xl">♠</div>
        <div className="text-[10px] font-black uppercase tracking-[0.45em] text-amber-300/60">Takım Kart Oyunu</div>
        <h1 className="mt-1 text-4xl font-black tracking-[0.08em] text-amber-300 md:text-5xl">ANASTRA</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/55">2 deste iskambil · 4 oyuncu · 2 takım</p>

        <div className="mt-8 space-y-3">
          <button type="button" onClick={onNewGame}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-400">
            🎮 Yeni Oyun
          </button>
          <button type="button" onClick={onShowRules}
            className="w-full rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3.5 font-bold text-amber-200 transition hover:bg-amber-300/15">
            📖 Nasıl Oynanır?
          </button>
          <button type="button" onClick={onShowSettings}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 font-bold text-white/75 transition hover:bg-white/10 hover:text-white">
            ⚙️ Ayarlar
          </button>
        </div>
      </div>
    </Overlay>
  );
}

interface SetupModalProps {
  playerName: string;
  onNameChange: (name: string) => void;
  onStart: (target: number) => void;
  onBack: () => void;
  onShowRules: () => void;
}

export function SetupModal({
  playerName,
  onNameChange,
  onStart,
  onBack,
  onShowRules,
}: SetupModalProps) {
  const targets = [751, 1051, 1251, 1751];
  const cleanName = playerName.trim();
  const canContinue = cleanName.length > 0;

  return (
    <Overlay>
      <div className="w-full max-w-md rounded-3xl border border-amber-300/20 bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-bold text-white/55 transition hover:text-white"
        >
          ← Ana Menü
        </button>

        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300/60">
            ANASTRA
          </div>
          <h2 className="mt-1 text-2xl font-black text-amber-300">
            Yeni Oyun
          </h2>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <label
            htmlFor="player-name"
            className="mb-2 block text-sm font-black text-white"
          >
            Adın ne?
          </label>
          <p className="mb-3 text-xs leading-5 text-white/50">
            İsmin oyun ve skor ekranlarında görünecek.
          </p>
          <input
            id="player-name"
            type="text"
            value={playerName}
            maxLength={16}
            autoComplete="nickname"
            placeholder="Adını yaz"
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/25 focus:border-amber-300/50"
          />
          <div className="mt-1 text-right text-[10px] text-white/30">
            {playerName.length}/16
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-3 text-center text-sm font-bold text-white/75">
            Hedef puanı seç
          </p>
          <div className="grid grid-cols-2 gap-3">
            {targets.map((target) => (
              <button
                key={target}
                type="button"
                disabled={!canContinue}
                onClick={() => onStart(target)}
                className="rounded-xl bg-emerald-600 py-4 text-xl font-black transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {target}
              </button>
            ))}
          </div>
          {!canContinue && (
            <p className="mt-3 text-center text-xs font-bold text-amber-200/80">
              Devam etmek için önce adını yaz.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onShowRules}
          className="mt-5 w-full rounded-xl border border-amber-300/20 bg-amber-300/5 py-2.5 text-sm font-bold text-amber-200 transition hover:bg-amber-300/10"
        >
          📖 Nasıl Oynanır?
        </button>
      </div>
    </Overlay>
  );
}

interface SettingsModalProps {
  soundEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  onClose: () => void;
}

export function SettingsModal({
  soundEnabled,
  onSoundChange,
  onClose,
}: SettingsModalProps) {
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300/60">
              ANASTRA
            </div>
            <h2 className="text-2xl font-black text-amber-300">Ayarlar</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Ayarları kapat"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-black">
                {soundEnabled ? '🔊 Oyun Sesleri' : '🔇 Oyun Sesleri'}
              </div>
              <div className="mt-1 text-xs leading-5 text-white/50">
                Kart çekme, kart atma, per ve sıra seslerini kontrol eder.
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={() => onSoundChange(!soundEnabled)}
              className={[
                'relative h-8 w-14 shrink-0 rounded-full border transition',
                soundEnabled
                  ? 'border-emerald-300/40 bg-emerald-500'
                  : 'border-white/10 bg-white/10',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all',
                  soundEnabled ? 'left-7' : 'left-1',
                ].join(' ')}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-amber-400 py-3 font-black text-slate-950 transition hover:bg-amber-300"
        >
          Tamam
        </button>
      </div>
    </Overlay>
  );
}

interface RoundOverModalProps {
  state: GameState;
  playerName?: string;
  onNext: () => void;
  onNewGame: () => void;
}

export function RoundOverModal({ state, playerName = 'Sen', onNext, onNewGame }: RoundOverModalProps) {
  const gameOver = state.phase === 'gameOver';
  const winnerTeam = state.winnerTeam;
  const target = state.targetScore;

  const remaining = [
    Math.max(0, target - state.teamScores[0]),
    Math.max(0, target - state.teamScores[1]),
  ];

  const roundLeader =
    state.roundScores[0] === state.roundScores[1]
      ? null
      : state.roundScores[0] > state.roundScores[1]
        ? 0
        : 1;

  return (
    <Overlay>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-b from-slate-900 via-slate-950 to-emerald-950 text-white shadow-2xl">
        <div className="border-b border-white/10 px-5 pb-4 pt-6 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300/60">
            ANASTRA
          </div>

          <div className="mt-2 text-4xl">
            {gameOver ? '🏆' : '♦️'}
          </div>

          <h2 className="mt-1 text-2xl font-black text-amber-300 md:text-3xl">
            {gameOver ? 'Oyun Bitti!' : 'El Sona Erdi'}
          </h2>

          {gameOver && winnerTeam !== null ? (
            <p className="mt-2 text-sm font-bold text-white/80">
              {winnerTeam === 0
                ? `🏆 ${playerName} + Ortak oyunu kazandı!`
                : '🏆 Rakip takım oyunu kazandı!'}
            </p>
          ) : (
            <p className="mt-2 text-xs text-white/50">
              El puanları toplam skora işlendi.
            </p>
          )}
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-white/55">
            <span>🎯 Hedef</span>
            <strong className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-200">
              {target}
            </strong>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div
              className={[
                'relative rounded-2xl border p-4 text-center',
                winnerTeam === 0
                  ? 'border-amber-300/50 bg-amber-300/10'
                  : 'border-sky-300/20 bg-sky-500/10',
              ].join(' ')}
            >
              {winnerTeam === 0 && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950">
                  KAZANAN
                </div>
              )}

              <div className="text-xs font-black uppercase tracking-wide text-sky-300">
                Takım 1
              </div>
              <div className="mt-1 text-[11px] text-white/45">
                {playerName} + Ortak
              </div>

              <div className="my-3 text-3xl font-black">
                {state.teamScores[0]}
              </div>

              <div className="rounded-xl bg-black/20 p-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Bu El
                </div>
                <div className="text-lg font-black text-sky-200">
                  {state.roundScores[0] >= 0 ? '+' : ''}
                  {state.roundScores[0]}
                </div>
              </div>

              {!gameOver && (
                <div className="mt-3 text-[11px] text-white/50">
                  Hedefe <b className="text-white/80">{remaining[0]}</b> puan
                </div>
              )}

              {!gameOver && roundLeader === 0 && (
                <div className="mt-2 text-[10px] font-bold text-emerald-300">
                  ▲ Bu el önde
                </div>
              )}
            </div>

            <div
              className={[
                'relative rounded-2xl border p-4 text-center',
                winnerTeam === 1
                  ? 'border-amber-300/50 bg-amber-300/10'
                  : 'border-rose-300/20 bg-rose-500/10',
              ].join(' ')}
            >
              {winnerTeam === 1 && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950">
                  KAZANAN
                </div>
              )}

              <div className="text-xs font-black uppercase tracking-wide text-rose-300">
                Takım 2
              </div>
              <div className="mt-1 text-[11px] text-white/45">
                Rakip Takım
              </div>

              <div className="my-3 text-3xl font-black">
                {state.teamScores[1]}
              </div>

              <div className="rounded-xl bg-black/20 p-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Bu El
                </div>
                <div className="text-lg font-black text-rose-200">
                  {state.roundScores[1] >= 0 ? '+' : ''}
                  {state.roundScores[1]}
                </div>
              </div>

              {!gameOver && (
                <div className="mt-3 text-[11px] text-white/50">
                  Hedefe <b className="text-white/80">{remaining[1]}</b> puan
                </div>
              )}

              {!gameOver && roundLeader === 1 && (
                <div className="mt-2 text-[10px] font-bold text-emerald-300">
                  ▲ Bu el önde
                </div>
              )}
            </div>
          </div>

          {!gameOver && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs text-white/55">
              Bir sonraki elde toplam skorlar korunarak oyun devam eder.
            </div>
          )}

          <div className="mt-4">
            {gameOver ? (
              <button
                type="button"
                onClick={onNewGame}
                className="w-full rounded-2xl bg-amber-400 py-3.5 font-black text-slate-950 transition hover:bg-amber-300 active:scale-[0.99]"
              >
                🎮 Yeni Oyun
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="w-full rounded-2xl bg-emerald-500 py-3.5 font-black text-slate-950 transition hover:bg-emerald-400 active:scale-[0.99]"
              >
                Sonraki El →
              </button>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm md:p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
        {children}
      </div>
    </div>
  );
}
