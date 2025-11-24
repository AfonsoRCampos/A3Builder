"use client";
import { useEffect, useState, useMemo } from "react";
import { MdOutlineEdit, MdDelete } from "react-icons/md";
import { FaEye } from "react-icons/fa";
import { FaDownload } from "react-icons/fa6";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { useUser } from "@/state/UserContext";
import { useA3s } from "@/state/A3Context";
import { useRouter } from "next/navigation";
import { toInitialLast } from "@/utils/Utils";
import A3Downloader from '@/components/A3Downloader';
import A3DetailModal from '@/components/A3DetailModal';
import GapAnalysisGraph from '@/components/charts/GapAnalysisGraph';
import { ensureLateFlagsForA3, ensureProgressForA3 } from '@/utils/actionsHelpers';

export default function A3List() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  const formattedUser =
    user
      ? user
        .split(" ")
        .map(
          (word) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ")
      : "";

  const { a3s = [], setA3s } = useA3s();

  // Ensure late flags and progress are up-to-date for all A3s and persist changes immediately.
  useEffect(() => {
    if (!Array.isArray(a3s) || a3s.length === 0) return;
    (async () => {
      const toSave = [];
      for (const item of a3s) {
        if (!item) continue;
        try {
          let updated = ensureLateFlagsForA3(item);
          updated = ensureProgressForA3(updated);
          if (JSON.stringify(updated) !== JSON.stringify(item)) {
            toSave.push(updated);
            setA3s(prev => {
              const idx = prev.findIndex(a => a?.header?.id === updated?.header?.id);
              if (idx === -1) return prev;
              const newArr = [...prev];
              newArr[idx] = updated;
              return newArr;
            });
          }
        } catch (e) {
          console.warn('Auto-update error for A3', item?.header?.id, e);
        }
      }
      if (toSave.length === 0) return;
      await Promise.all(toSave.map(async (u) => {
        try {
          const res = await fetch('/api/a3s', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(u)
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            console.warn('Auto-save failed for', u?.header?.id, res.status, txt);
          }
        } catch (e) {
          console.warn('Auto-save failed for', u?.header?.id, e);
        }
      }));
      // Refresh to pick up persisted changes
      if (router && typeof router.refresh === 'function') router.refresh();
    })();
  }, [a3s, setA3s, router]);

  const [showDownloader, setShowDownloader] = useState(false);
  const [downloadA3, setDownloadA3] = useState(null);
  // Details modal state: selected A3 and visibility
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailA3, setDetailA3] = useState(null);

  // UI state for filters & sorting
  const [statusFilter, setStatusFilter] = useState('all'); // all | draft | published
  const [memberFilter, setMemberFilter] = useState('all'); // all | owner | team
  const [dateFilter, setDateFilter] = useState('all'); // all | upcoming | ongoing | finished | none
  const [sortOption, setSortOption] = useState('id:asc'); // e.g. id:asc, title:desc, start:asc, end:desc

  // base visibility rules (owner/team visibility)
  const baseVisible = (a3s || []).filter(a3 => {
    if (!a3 || !a3.header) return false;
    const owner = a3.header.owner;
    const team = Array.isArray(a3.header.team) ? a3.header.team : [];
    return owner === user || team.includes(user);
  });

  const finalList = useMemo(() => {
    // apply status filter
    let list = baseVisible.slice();
    if (statusFilter === 'draft') list = list.filter(i => i?.draft);
    else if (statusFilter === 'published') list = list.filter(i => i?.published);

    // apply member filter
    if (memberFilter === 'owner') {
      list = list.filter(a3 => {
        const owner = a3.header.owner;
        return owner === user;
      });
    } else if (memberFilter === 'team') {
      list = list.filter(a3 => {
        const owner = a3.header.owner;
        const team = Array.isArray(a3.header.team) ? a3.header.team : [];
        return owner !== user && team.includes(user);
      });
    }

    // apply date filter
    const now = new Date();
    if (dateFilter === 'upcoming') {
      list = list.filter(a3 => {
        const start = a3?.header?.start ? new Date(a3.header.start) : null;
        return start > now;
      });
    } else if (dateFilter === 'ongoing') {
      list = list.filter(a3 => {
        const start = a3?.header?.start ? new Date(a3.header.start) : null;
        const end = a3?.header?.end ? new Date(a3.header.end) : null;
        return start <= now && end >= now;
      });
    } else if (dateFilter === 'finished') {
      list = list.filter(a3 => {
        if (!a3 || !a3.header || !a3.header.end) return false;
        const end = a3?.header?.end ? new Date(a3.header.end) : null;
        return end < now;
      });
    } else if (dateFilter === 'none') {
      list = list.filter(a3 => {
        const start = a3?.header?.start ? new Date(a3.header.start) : null;
        const end = a3?.header?.end ? new Date(a3.header.end) : null;
        return !start && !end;
      });
    }


    const [field, dir] = (sortOption || 'id:asc').split(':');
    const dirMul = dir === 'desc' ? -1 : 1;

    const parseDate = (v) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d) ? null : d;
    };

    list.sort((a, b) => {
      if (field === 'id') {
        const A = String(a?.header?.id || '');
        const B = String(b?.header?.id || '');
        return A.localeCompare(B) * dirMul;
      }
      if (field === 'title') {
        const A = String(a?.header?.title || '').toLowerCase();
        const B = String(b?.header?.title || '').toLowerCase();
        return A.localeCompare(B) * dirMul;
      }
      if (field === 'start' || field === 'end') {
        const A = parseDate(a?.header?.start);
        const B = parseDate(b?.header?.start);
        const AA = field === 'start' ? A : parseDate(a?.header?.end);
        const BB = field === 'start' ? B : parseDate(b?.header?.end);
        if (AA === null && BB === null) return 0;
        if (AA === null) return 1 * dirMul; // nulls last
        if (BB === null) return -1 * dirMul;
        return (AA - BB) * dirMul;
      }
      return 0;
    });

    return list;
  }, [baseVisible, statusFilter, sortOption, memberFilter, dateFilter, user]);

  const formatTeam = (team = [], owner) => {
    if (!team || team.length === 0) return '-';
    const others = (team || []).filter(t => t !== owner).map(toInitialLast);
    return others.join(', ');
  };

  // Delete handler for an A3 entry
  const handleDelete = async (fullId) => {
    if (!fullId) return;
    const ok = confirm(`Delete A3 ${fullId}? This operation cannot be undone.`);
    if (!ok) return;
    try {
      const res = await fetch('/api/a3s', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fullId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed to delete A3');
        return;
      }
      // refresh the page data (app router)
      if (router && typeof router.refresh === 'function') router.refresh();
    } catch (e) {
      console.error('Delete failed', e);
      alert('Delete failed');
    }
  };

  if (!user) { return null; }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '5vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ margin: 0 }}>Welcome, <strong>{formattedUser}</strong>!</h1>
      </div>

      {/* Filters: status segmented control + sort dropdown (5vh) */}
      <div style={{ height: '5vh', padding: '0px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'center', height: '3vh' }}>
          {/* segmented: All / Draft / Published (continuous) */}
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0px 10px',
              borderRadius: '6px 0 0 6px',
              border: '1px solid rgba(0,0,0,0.06)',
              background: statusFilter === 'all' ? 'var(--gray-dark)' : 'transparent',
              color: statusFilter === 'all' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >All</button>

          <button
            onClick={() => setStatusFilter('draft')}
            style={{
              padding: '0px 10px',
              borderRadius: '0',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: 'none',
              background: statusFilter === 'draft' ? 'var(--gray)' : 'transparent',
              color: statusFilter === 'draft' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >Draft</button>

          <button
            onClick={() => setStatusFilter('published')}
            style={{
              padding: '0px 10px',
              borderRadius: '0 6px 6px 0',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: 'none',
              background: statusFilter === 'published' ? 'var(--accent)' : 'transparent',
              color: statusFilter === 'published' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >Published</button>
        </div>

        <div style={{ display: 'flex', gap: 0, alignItems: 'center', height: '3vh' }}>
          {/* segmented: All / Draft / Published (continuous) */}
          <button
            onClick={() => setMemberFilter('all')}
            style={{
              padding: '0px 10px',
              borderRadius: '6px 0 0 6px',
              border: '1px solid rgba(0,0,0,0.06)',
              background: memberFilter === 'all' ? 'var(--gray-dark)' : 'transparent',
              color: memberFilter === 'all' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >All</button>

          <button
            onClick={() => setMemberFilter('owner')}
            style={{
              padding: '0px 10px',
              borderRadius: '0',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: 'none',
              background: memberFilter === 'owner' ? 'var(--main)' : 'transparent',
              color: memberFilter === 'owner' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >Owner</button>

          <button
            onClick={() => setMemberFilter('team')}
            style={{
              padding: '0px 10px',
              borderRadius: '0 6px 6px 0',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: 'none',
              background: memberFilter === 'team' ? 'var(--cancel)' : 'transparent',
              color: memberFilter === 'team' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >Team Member</button>
        </div>

        <div style={{ display: 'flex', gap: 0, alignItems: 'center', height: '3vh' }}>
          {/* segmented: All / Draft / Published (continuous) */}
          <button
            onClick={() => setDateFilter('all')}
            style={{
              padding: '0px 10px',
              borderRadius: '6px 0 0 6px',
              border: '1px solid rgba(0,0,0,0.06)',
              background: dateFilter === 'all' ? 'var(--gray-dark)' : 'transparent',
              color: dateFilter === 'all' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >All</button>

          <button
            onClick={() => setDateFilter('upcoming')}
            style={{
              padding: '0px 10px',
              borderRadius: '0',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: 'none',
              background: dateFilter === 'upcoming' ? 'var(--orange)' : 'transparent',
              color: dateFilter === 'upcoming' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >Upcoming</button>

          <button
            onClick={() => setDateFilter('ongoing')}
            style={{
              padding: '0px 10px',
              borderRadius: '0',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: 'none',
              background: dateFilter === 'ongoing' ? 'var(--green)' : 'transparent',
              color: dateFilter === 'ongoing' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >Ongoing</button>

          <button
            onClick={() => setDateFilter('finished')}
            style={{
              padding: '0px 10px',
              borderRadius: '0',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: 'none',
              background: dateFilter === 'finished' ? 'var(--blue)' : 'transparent',
              color: dateFilter === 'finished' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >Finished</button>

          <button
            onClick={() => setDateFilter('none')}
            style={{
              padding: '0px 10px',
              borderRadius: '0 6px 6px 0',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: 'none',
              background: dateFilter === 'none' ? 'var(--gray-dark)' : 'transparent',
              color: dateFilter === 'none' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >None</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--gray-dark)' }}>Sort</label>
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', padding: '4px 8px' }}>
            <option value="id:asc">ID (asc)</option>
            <option value="id:desc">ID (desc)</option>
            <option value="title:asc">Title (asc)</option>
            <option value="title:desc">Title (desc)</option>
            <option value="start:asc">Start (asc)</option>
            <option value="start:desc">Start (desc)</option>
            <option value="end:asc">End (asc)</option>
            <option value="end:desc">End (desc)</option>
          </select>
        </div>
      </div>

      <div style={{ height: '90vh', padding: 16, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <th className="cell-scroll" style={{ padding: '8px', width: '2.5%', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.08)' }}>ID</th>
              <th className="cell-scroll" style={{ padding: '8px', width: '2.5%', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.08)' }}>Ver.</th>
              <th className="cell-scroll" style={{ padding: '8px', width: '10%', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.08)' }}>Title</th>
              <th className="cell-scroll" style={{ padding: '8px', width: '10%', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.08)' }}>Time span</th>
              <th className="cell-scroll" style={{ padding: '8px', width: '5%', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.08)' }}>Owner</th>
              <th className="cell-scroll" style={{ padding: '8px', width: '20%', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.08)' }}>Team</th>
              <th className="cell-scroll" style={{ padding: '8px', width: '15%', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.08)' }}>Tags</th>
              <th className="cell-scroll" style={{ padding: '8px', width: '10%', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.08)' }}>Actions</th>
              <th className="cell-scroll" style={{ padding: '8px', width: '15%', textAlign: 'center' }}>Detail (Click to Expand)</th>
            </tr>
          </thead>
          <tbody>
            {finalList.map((item) => {
              const id = item?.header?.id || '';
              const parts = String(id).split('-');
              const idSecond = parts[1] || '';
              const version = parts[2] || '';
              const owner = item?.header?.owner;
              const team = Array.isArray(item?.header?.team) ? item.header.team : [];
              const isOwner = owner === user;
              const isTeamMember = !isOwner && team.includes(user);
              const startRaw = item?.header?.start;
              const endRaw = item?.header?.end;
              const lastUpdateRaw = item?.header?.lastUpdated;
              const lag = item?.metrics?.lag;

              const parseDate = (v) => {
                if (!v) return null;
                const d = new Date(v);
                return isNaN(d) ? null : d;
              };

              const formatDateShort = (v) => {
                const d = parseDate(v);
                if (!d) return '';
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = String(d.getFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
              };

              const startDate = parseDate(startRaw);
              const endDate = parseDate(endRaw);
              const lastUpdate = formatDateShort(parseDate(lastUpdateRaw));

              const today = new Date();
              // normalize time-of-day for comparisons
              const normalize = (d) => d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
              const nToday = normalize(today);
              const nStart = normalize(startDate);
              const nEnd = normalize(endDate);

              let timeSpanText = '-';
              if (startDate || endDate) {
                const s = startDate ? formatDateShort(startDate) : '—';
                const e = endDate ? formatDateShort(endDate) : '—';
                timeSpanText = `${s} to ${e}`;
              }

              let scheduleTag = null; // 'Ongoing' | 'Upcoming' | 'Finished'
              if (nStart || nEnd) {
                if (nStart && nEnd) {
                  if (nToday >= nStart && nToday <= nEnd) scheduleTag = 'Ongoing';
                  else if (nToday < nStart) scheduleTag = 'Upcoming';
                  else scheduleTag = 'Finished';
                } else if (nStart && !nEnd) {
                  scheduleTag = nToday >= nStart ? 'Ongoing' : 'Upcoming';
                } else if (!nStart && nEnd) {
                  scheduleTag = nToday <= nEnd ? 'Ongoing' : 'Finished';
                }
              }

              return (
                <tr key={id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <td className="cell-scroll" style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{idSecond}</td>
                  <td className="cell-scroll" style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{version}</td>
                  <td className="cell-scroll" style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{item?.header?.title || '(untitled)'}</td>
                  <td className="cell-scroll" style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{timeSpanText}</td>
                  <td className="cell-scroll" style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{toInitialLast(owner)}</td>
                  <td className="cell-scroll" style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.04)' }}>{formatTeam(team, owner)}</td>
                  <td className="cell-scroll" style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {
                        (() => {
                          // Build labels with mutually exclusive rules and max 3 badges
                          const labels = [];

                          // status: prefer published, otherwise draft
                          if (item?.published) labels.push({ key: 'published', text: 'Published', bg: 'var(--accent)' });
                          else if (item?.draft) labels.push({ key: 'draft', text: 'Draft', bg: 'var(--gray)' });

                          // role: owner OR team member (mutually exclusive)
                          if (isOwner) labels.push({ key: 'owner', text: 'Owner', bg: 'var(--main)' });
                          else if (isTeamMember) labels.push({ key: 'team', text: 'Team Member', bg: 'var(--cancel)' });

                          // schedule tag (Ongoing / Upcoming / Finished)
                          if (scheduleTag) labels.push({ key: `schedule:${scheduleTag}`, text: scheduleTag, bg: scheduleTag === 'Ongoing' ? 'var(--green)' : scheduleTag === 'Upcoming' ? 'var(--orange)' : 'var(--blue)' });

                          // limit to at most 3 badges
                          const shown = labels.slice(0, 3);

                          return shown.map(l => (
                            <span key={l.key} style={{ background: l.bg, color: 'white', padding: '4px 8px', borderRadius: 12 }}>{l.text}</span>
                          ));
                        })()
                      }
                    </div>
                  </td>
                  <td style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ width: '100%', padding: 2 }}>
                      {/* actions container: divide available width into 4 equal circular buttons */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                        {/** Each button gets equal flex and maxWidth = 25% so they occupy up to a quarter each. Aspect ratio keeps them square. */}
                        <button
                          title="Edit A3"
                          onClick={() => router.push(`/a3/${encodeURIComponent(id)}/edit`)}
                          style={{
                            flex: '1 1 0',
                            maxWidth: '20%',
                            aspectRatio: '1 / 1',
                            borderRadius: '50%',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--main)',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          aria-label="Edit"
                        >
                          <MdOutlineEdit size={15} />
                        </button>

                        <button
                          title="View"
                          onClick={() => router.push(`/a3/${encodeURIComponent(id)}/view`)}
                          style={{
                            flex: '1 1 0',
                            maxWidth: '20%',
                            aspectRatio: '1 / 1',
                            borderRadius: '50%',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--orange)',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          aria-label="View A3"
                        >
                          <FaEye size={15} />
                        </button>

                        {/* <button
                          title="A3 Details"
                          onClick={() => { setDetailA3(item); setShowDetailModal(true); }}
                          style={{
                            flex: '1 1 0',
                            maxWidth: '20%',
                            aspectRatio: '1 / 1',
                            borderRadius: '50%',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--blue)',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          aria-label="Details"
                        >
                          <FaMagnifyingGlass size={13} />
                        </button> */}

                        <button
                          title="Download (A3 sheet)"
                          onClick={() => { setDownloadA3(item); setShowDownloader(true); }}
                          style={{
                            flex: '1 1 0',
                            maxWidth: '20%',
                            aspectRatio: '1 / 1',
                            borderRadius: '50%',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--green)',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          aria-label="Download"
                        >
                          <FaDownload size={11} />
                        </button>

                        <button
                          title="Delete A3"
                          onClick={() => handleDelete(id)}
                          style={{
                            flex: '1 1 0',
                            maxWidth: '20%',
                            aspectRatio: '1 / 1',
                            borderRadius: '50%',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--cancel)',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          aria-label="Delete"
                        >
                          <MdDelete size={15} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td
                    className="cell-scroll"
                    style={{
                      padding: '8px',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                    }}
                    onClick={() => { setDetailA3(item); setShowDetailModal(true); }}
                  >
                    <div style={{ width: '100%', height: '100%' }}>
                      <GapAnalysisGraph metric={lag} unit={lag?.unit} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {finalList.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 16, color: '#666' }}>No A3s to show</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showDownloader && (
        <A3Downloader a3={downloadA3} format={'A3'} onFinish={() => { setShowDownloader(false); setDownloadA3(null); }} />
      )}

      <A3DetailModal open={showDetailModal} a3={detailA3} onClose={() => { setShowDetailModal(false); setDetailA3(null); }} />
    </main>
  );
}