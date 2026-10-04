import React, { useState, useEffect } from 'react';
import {
  useLatestSession,
  useSessionDrivers,
  useSessionPositions,
  useSessionIntervals,
  useRaceControl,
  useSessionPitStops,
} from '../hooks/useOpenF1';
import { useLastRaceResults } from '../hooks/useJolpica';
import { getTeamColor } from '../utils/teamColors';
import { getFlagUrl } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// ─── Flag config ──────────────────────────────────────────────────────
const FLAG_CFG = {
  GREEN: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', label: 'YEŞİL BAYRAK' },
  YELLOW: { color: '#eab308', bg: 'rgba(234,179,8,0.10)', label: 'SARI BAYRAK' },
  RED: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'KIRMIZI BAYRAK' },
  SAFETY_CAR: { color: '#f97316', bg: 'rgba(249,115,22,0.10)', label: 'SAFETY CAR' },
  VSC: { color: '#a855f7', bg: 'rgba(168,85,247,0.10)', label: 'VIRTUAL SC' },
  CHEQUERED: { color: '#ffffff', bg: 'rgba(255,255,255,0.06)', label: 'DAMALI BAYRAK' },
};

// Race-only sessions we care about (filter out practice spam)
const PRIORITY_SESSIONS = ['Race', 'Qualifying', 'Sprint', 'Sprint Qualifying'];

// ─── Pos badge (reused everywhere) ────────────────────────────────────
const MC = { 1: '#FFD700', 2: '#B8BEC8', 3: '#CD7F32' };
const TC = { 1: '#1a1200', 2: '#0e1018', 3: '#1a0a00' };

function PosBadge({ pos, size = 24 }) {
  const p = typeof pos === 'number' ? pos : parseInt(pos);
  if (p <= 3) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: MC[p],
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.42,
          fontWeight: 900,
          color: TC[p],
          boxShadow: `0 0 8px ${MC[p]}50`,
          flexShrink: 0,
        }}
      >
        {p}
      </div>
    );
  }
  return (
    <span
      style={{
        fontSize: size * 0.46,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.22)',
        width: size,
        textAlign: 'center',
        display: 'inline-block',
        flexShrink: 0,
      }}
    >
      {p}
    </span>
  );
}

// ─── Session type icon (SVG, no emoji) ────────────────────────────────
function SessionIcon({ type, size = 16 }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 };
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (type) {
    case 'Race':
      return (
        <svg {...s} viewBox="0 0 20 20" {...p}>
          <path d="M3 17V3h14v6H3M10 3v6M17 3v6" />
          <path d="M3 9h14v0" />
        </svg>
      ); // checkered
    case 'Qualifying':
    case 'Sprint Qualifying':
      return (
        <svg {...s} viewBox="0 0 20 20" {...p}>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 2.5" />
        </svg>
      ); // clock
    case 'Sprint':
      return (
        <svg {...s} viewBox="0 0 20 20" {...p}>
          <path d="M13 2L5 12h5l-1 6 8-10h-5l1-6z" />
        </svg>
      ); // bolt
    default:
      return (
        <svg {...s} viewBox="0 0 20 20" {...p}>
          <path d="M10 3a3 3 0 00-3 3v2h6V6a3 3 0 00-3-3zM5 8v6a4 4 0 008 0V8" />
          <path d="M8 11h4" />
        </svg>
      ); // wrench
  }
}

// ─── Flag banner ──────────────────────────────────────────────────────
function FlagBanner({ flag }) {
  if (!flag || flag === 'GREEN') return null;
  const cfg = FLAG_CFG[flag] || FLAG_CFG.GREEN;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: cfg.bg,
        border: `1px solid ${cfg.color}30`,
        borderRadius: 12,
        padding: '10px 18px',
        marginBottom: 14,
        animation: 'pulse 1s infinite',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: cfg.color,
          display: 'block',
          boxShadow: `0 0 12px ${cfg.color}`,
        }}
      />
      <span style={{ fontSize: 13, fontWeight: 900, color: cfg.color, letterSpacing: 0.5 }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Timing row ───────────────────────────────────────────────────────
function TimingRow({ pos, driver, intervalData }) {
  const teamColor = getTeamColor(driver?.team_name);
  const dColor = driver?.team_colour ? `#${driver.team_colour}` : teamColor.primary;
  const isTop3 = pos.position <= 3;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isTop3 ? `${dColor}07` : 'transparent',
        position: 'relative',
        transition: 'background 0.3s',
      }}
    >
      {isTop3 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 2.5,
            background: dColor,
            boxShadow: `2px 0 8px ${dColor}50`,
          }}
        />
      )}

      {/* Position */}
      <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
        <PosBadge pos={pos.position} />
      </div>

      {/* Car number badge */}
      <div
        style={{
          width: 30,
          height: 20,
          borderRadius: 6,
          flexShrink: 0,
          background: `${dColor}18`,
          border: `1px solid ${dColor}28`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 900,
          color: dColor,
        }}
      >
        {pos.driver_number}
      </div>

      {/* Team dot + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dColor,
            flexShrink: 0,
            boxShadow: `0 0 6px ${dColor}80`,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {driver ? `${driver.first_name} ${driver.last_name}` : `#${pos.driver_number}`}
          </div>
          {driver?.team_name && (
            <div
              style={{ fontSize: 9, color: dColor, opacity: 0.75, fontWeight: 600, marginTop: 1 }}
            >
              {driver.team_name}
            </div>
          )}
        </div>
      </div>

      {/* Gap to leader */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
        {pos.position === 1 ? (
          <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 800 }}>LEADER</span>
        ) : (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'monospace',
            }}
          >
            {intervalData?.gap_to_leader || '—'}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Race control message ─────────────────────────────────────────────
function RCMsg({ msg }) {
  const flag = FLAG_CFG[msg.flag];
  const t = new Date(msg.date).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return (
    <div
      style={{
        padding: '8px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.18)',
          fontFamily: 'monospace',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {t}
      </span>
      {flag && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: flag.color,
            flexShrink: 0,
            marginTop: 4,
            boxShadow: `0 0 4px ${flag.color}`,
          }}
        />
      )}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
        {msg.message}
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────
function EmptyTimingState({ session }) {
  const sessionDate = session ? new Date(session.date_start) : null;
  const isPast = sessionDate && sessionDate < new Date();
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}
      >
        <SessionIcon type={isPast ? 'Race' : 'default'} size={22} />
      </div>
      <div
        style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}
      >
        {isPast ? 'Oturum Tamamlandı' : 'Oturum Başlamadı'}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
          lineHeight: 1.5,
          maxWidth: 260,
          margin: '0 auto',
        }}
      >
        {isPast
          ? 'OpenF1 bu oturumun anlık verisini arşivlememiş olabilir. Son yarış sonuçları için aşağıya bakın.'
          : sessionDate
            ? `${sessionDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihinde başlayacak.`
            : 'Oturum bilgisi yok.'}
      </div>
    </div>
  );
}

// ─── Last race fallback ───────────────────────────────────────────────
function LastRace({ race, results }) {
  // Hook must be called before any early returns (React rules of hooks)
  const [expanded, setExpanded] = useState(false);

  if (!race || !results.length) return null;
  const shown = expanded ? results : results.slice(0, 10);

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.25)',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Son Yarış · {race.raceName} {race.season}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '3px 10px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {expanded ? 'Küçült' : 'Tümünü Gör'}
        </button>
      </div>
      <div
        style={{
          background: '#0A0A0D',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {shown.map((r, i) => {
          const drv = r.Driver;
          const team = r.Constructor;
          const color = getTeamColor(team?.name);
          const p = parseInt(r.position);
          const isTop = p <= 3;
          return (
            <div
              key={drv?.driverId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 14px',
                borderBottom: i < shown.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                position: 'relative',
              }}
            >
              {isTop && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 2.5,
                    background: color.primary,
                    boxShadow: `2px 0 6px ${color.primary}50`,
                  }}
                />
              )}
              <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
                <PosBadge pos={p} />
              </div>
              <img
                src={getFlagUrl(drv?.nationality)}
                alt=""
                style={{
                  width: 18,
                  height: 12,
                  borderRadius: 2,
                  flexShrink: 0,
                  objectFit: 'cover',
                }}
                onError={e => (e.target.style.display = 'none')}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {drv?.givenName} <strong>{drv?.familyName}</strong>
                </div>
                <div style={{ fontSize: 9, color: color.primary, fontWeight: 700 }}>
                  {team?.name}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div
                  style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}
                >
                  {r.Time?.time || r.status}
                </div>
                {parseInt(r.points) > 0 && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: isTop ? '#FFD700' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    +{r.points} pt
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────
function SessionCard({ s, active, onClick }) {
  const isPriority = PRIORITY_SESSIONS.includes(s.session_name);
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 10,
        border: '1px solid',
        borderColor: active
          ? 'rgba(255,255,255,0.35)'
          : isPriority
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.06)',
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: active ? 'white' : isPriority ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'var(--font)',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      <SessionIcon type={s.session_name} size={12} />
      {s.country_name} · {s.session_name}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────
export default function LiveSession() {
  const { session: latest, sessions, loading: sLoad } = useLatestSession();
  const [picked, setPicked] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Kullanıcı elle seçmediyse en güncel oturumu otomatik takip et.
  const sel = picked || latest;
  const setSel = setPicked;

  const sk = sel?.session_key;

  // Determine if session is live (within 4h of start)
  const sessionStart = sel ? new Date(sel.date_start) : null;
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const now = new Date();
  const isLive = sessionStart && Math.abs(now - sessionStart) < 4 * 3600_000;
  // Past session: started more than 4h ago
  const isPast = sessionStart && now - sessionStart > 4 * 3600_000;

  const { drivers, driverMap } = useSessionDrivers(sk);
  const { positions, loading: posLoading, error: posError } = useSessionPositions(sk, isLive);
  const { intervals } = useSessionIntervals(sk, isLive);
  const { messages, currentFlag } = useRaceControl(sk, isLive);
  const { pitStops } = useSessionPitStops(sk);
  const { race, results } = useLastRaceResults();

  const intMap = {};
  intervals.forEach(i => {
    intMap[i.driver_number] = i;
  });

  // Sort sessions: priority first, then by date
  const sortedSessions = [...sessions].sort((a, b) => {
    const aPri = PRIORITY_SESSIONS.includes(a.session_name) ? 0 : 1;
    const bPri = PRIORITY_SESSIONS.includes(b.session_name) ? 0 : 1;
    if (aPri !== bPri) return aPri - bPri;
    return new Date(b.date_start) - new Date(a.date_start);
  });

  const visibleSessions = showAll ? sortedSessions : sortedSessions.slice(0, 8);

  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: 920 }}>
        {/* Header */}
        <div className="page-header">
          <div className="page-title-row">
            <h1>Canlı Takip</h1>
            {isLive ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 99,
                  padding: '4px 14px',
                  fontSize: 11,
                  fontWeight: 900,
                  color: '#ef4444',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse 1s infinite',
                    display: 'block',
                  }}
                />
                CANLI
              </span>
            ) : isPast ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 99,
                  padding: '4px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Arşiv
              </span>
            ) : null}
          </div>
          <p>OpenF1 anlık veri · {isLive ? '5 sn güncelleme' : 'Tamamlanan oturum arşivi'}</p>
        </div>

        {/* Session selector */}
        {!sLoad && sortedSessions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 4 }}>
              {visibleSessions.map(s => (
                <SessionCard
                  key={s.session_key}
                  s={s}
                  active={s.session_key === sel?.session_key}
                  onClick={() => setSel(s)}
                />
              ))}
              {sortedSessions.length > 8 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {showAll ? '− Daha az' : `+ ${sortedSessions.length - 8} oturum`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Session info card */}
        {sel && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18,
              padding: '16px 20px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <SessionIcon type={sel.session_name} size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>
                {sel.country_name} — {sel.session_name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                {sel.circuit_short_name} ·{' '}
                {sessionStart?.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
              {[
                { val: positions.length || drivers.length || '—', label: 'Sürücü' },
                { val: pitStops.length || '—', label: 'Pit' },
                { val: messages.length || '—', label: 'Mesaj' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{s.val}</div>
                  <div
                    style={{
                      fontSize: 8,
                      color: 'rgba(255,255,255,0.22)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flag banner */}
        <FlagBanner flag={currentFlag} />

        {/* Main grid — responsive */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 290px)',
            gap: 14,
            alignItems: 'start',
          }}
        >
          {/* Timing tower */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Sıralama{' '}
                {isLive && (
                  <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#22c55e',
                        animation: 'pulse 1s infinite',
                        display: 'block',
                      }}
                    />{' '}
                    5s
                  </span>
                )}
              </div>
              {positions.length > 0 && (
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
                  {positions.length} sürücü
                </div>
              )}
            </div>
            <div
              style={{
                background: '#0A0A0D',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18,
                overflow: 'hidden',
              }}
            >
              {sLoad || posLoading ? (
                <div style={{ padding: 32 }}>
                  <LoadingSpinner text="Yükleniyor..." />
                </div>
              ) : positions.length > 0 ? (
                positions.map(p => (
                  <TimingRow
                    key={p.driver_number}
                    pos={p}
                    driver={driverMap[p.driver_number]}
                    intervalData={intMap[p.driver_number]}
                  />
                ))
              ) : posError ? (
                <div
                  style={{
                    padding: '32px 24px',
                    textAlign: 'center',
                    fontSize: 12,
                    color: '#ef4444',
                  }}
                >
                  Canlı veri alınamadı ({posError}). Otomatik olarak tekrar denenecek.
                </div>
              ) : (
                <EmptyTimingState session={sel} />
              )}
            </div>

            {/* Pit stops */}
            {pitStops.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  Pit Stop Logları ({pitStops.length})
                </div>
                <div
                  style={{
                    background: '#0A0A0D',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  {pitStops.slice(0, 12).map((pit, i) => {
                    const drv = driverMap[pit.driver_number];
                    const color = getTeamColor(drv?.team_name);
                    const dCol = drv?.team_colour ? `#${drv.team_colour}` : color.primary;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 14px',
                          borderBottom:
                            i < Math.min(pitStops.length, 12) - 1
                              ? '1px solid rgba(255,255,255,0.04)'
                              : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: dCol,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>
                            {drv ? `${drv.first_name} ${drv.last_name}` : `#${pit.driver_number}`}
                          </div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>
                            Tur {pit.lap_number}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            color: dCol,
                          }}
                        >
                          {pit.pit_duration ? `${pit.pit_duration.toFixed(1)}s` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Race control */}
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.25)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              Yarış Kontrolü
            </div>
            <div
              style={{
                background: '#0A0A0D',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: '10px 14px',
                maxHeight: 500,
                overflowY: 'auto',
              }}
            >
              {messages.length > 0 ? (
                messages.map((m, i) => <RCMsg key={i} msg={m} />)
              ) : (
                <div style={{ padding: '28px 0', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                      color: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 10a7 7 0 0114 0" />
                      <path d="M7 10a3 3 0 016 0" />
                      <circle cx="10" cy="10" r="1" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>Mesaj yok</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Last race */}
        <LastRace race={race} results={results} />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media (max-width: 700px) {
          .container > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
