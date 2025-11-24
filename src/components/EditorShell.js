"use client";
import React, { useState, useRef } from "react";
import ImagePickerModal from '@/components/ImagePickerModal';
import A3HeaderForm from "@/components/A3HeaderForm";
import A3ProbDefForm from "@/components/A3ProbDefForm";
import Canvas from "@/components/Canvas";
import MetricsForm from "@/components/MetricsForm";
import ActionsForm from "@/components/ActionsForm";
import CheckActForm from '@/components/CheckActForm';
import { useUser } from '@/state/UserContext';
import { toInitialLast, formatCommentTimestamp } from '@/utils/Utils';

export default function EditorShell({ a3, setA3, activeArea, boundsPreview, boundsPlan2, boundsPlan4 }) {
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageToCreateCurrentState, setImageToCreateCurrentState] = useState(null);
  const [imageToCreateActionPlan, setImageToCreateActionPlan] = useState(null);
  const imagePickerTarget = useRef(null);
  const { user } = useUser();
  const [newCurrentComment, setNewCurrentComment] = useState('');

  const aspectRatios = {
    2: `${boundsPlan2.width}/${boundsPlan2.height}`,
    4: `${boundsPlan4.width}/${boundsPlan4.height}`,
    default: ""
  };

  const colors = [
    ["var(--blue-highlight)", "var(--blue-highlight)", "var(--blue)"],
    ["var(--accent-highlight)", "var(--accent-highlight)", "var(--accent)"],
    ["white", "var(--accent-highlight)", "var(--accent)"],
    ["var(--accent-highlight)", "var(--accent-highlight)", "var(--accent)"],
    ["white", "var(--accent-highlight)", "var(--accent)"],
    ["var(--green-highlight)", "var(--green-highlight)", "var(--green)"],
    ["var(--orange-highlight)", "var(--orange-highlight)", "var(--orange)"],
  ];

  const editorAspectRatio = aspectRatios[activeArea] || aspectRatios.default;

  const editors = [
    () => <A3HeaderForm header={a3.header} setA3={setA3} />,
    () => <A3ProbDefForm probDef={a3.probDef} lag={a3.metrics.lag} setA3={setA3} end={a3.header.end} />,
    () => <Canvas
      key={'currentState'}
      a3Key='currentState'
      nodes={a3.currentState.nodes}
      edges={a3.currentState.edges}
      editable={true}
      setA3={setA3}
      toggleImgSelector={() => { imagePickerTarget.current = 'currentState'; setImagePickerOpen(true); }}
      imageToCreate={imageToCreateCurrentState}
      onImageCreated={() => setImageToCreateCurrentState(null)}
    />,
    () => <MetricsForm metrics={a3.metrics} setA3={setA3} start={a3.header.start} end={a3.header.end} />,
    () => <Canvas
      key={'actionPlan'}
      a3Key='actionPlan'
      nodes={a3.actionPlan.nodes}
      edges={a3.actionPlan.edges}
      editable={true}
      setA3={setA3}
      toggleImgSelector={() => { imagePickerTarget.current = 'actionPlan'; setImagePickerOpen(true); }}
      imageToCreate={imageToCreateActionPlan}
      onImageCreated={() => setImageToCreateActionPlan(null)}
    />,
    () => <ActionsForm a3={a3} setA3={setA3} />,
    () => <CheckActForm a3={a3} setA3={setA3} />,
  ];

  const checkboxStyle = {
    width: 16,
    height: 16,
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'inline-block',
    verticalAlign: 'middle',
    boxSizing: 'border-box',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundColor: 'transparent'
  }

  console.log(activeArea)
  console.log(colors[activeArea])

  return (
    <>
      <ImagePickerModal
        open={imagePickerOpen}
        onCancel={() => { setImagePickerOpen(false); imagePickerTarget.current = null; }}
        onConfirm={(img) => {
          setImagePickerOpen(false);
          if (imagePickerTarget.current === 'currentState') {
            setImageToCreateCurrentState({ src: img.src, name: img.name });
          } else if (imagePickerTarget.current === 'actionPlan') {
            setImageToCreateActionPlan({ src: img.src, name: img.name });
          }
          imagePickerTarget.current = null;
        }}
      />

      {/* Editor Zone */}
      <div
        style={{
          maxWidth: boundsPreview.width,
          height: (activeArea === 2 || activeArea === 4 ? "" : activeArea === 0 ? "auto" : "min-content"),
          width: boundsPreview.width,
          aspectRatio: editorAspectRatio,
          background: colors[activeArea]?.[0] || "white",
          boxSizing: "border-box",
          border: "4px solid",
          borderColor: colors[activeArea]?.[2] || "var(--main)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "start",
          justifyContent: "center",
          overflow: (activeArea === 0 ? "visible" : "auto"),
          padding: "1em",
          borderRadius: "8px",
        }}
      >
        {activeArea === null ? (
          <div style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
          }}>
            Click an A3 section to edit.
          </div>
        ) : (
          editors[activeArea]()
        )}
      </div>
      {activeArea === 2 && (
        <div style={{ width: boundsPreview.width }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0, flex: '0 1 auto' }}>
            <input
              type="checkbox"
              checked={a3.layout.extraCurrentState.enabled}
              onChange={e => setA3(prev => {
                const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                next.layout = next.layout || {};
                next.layout.extraCurrentState = next.layout.extraCurrentState || {};
                next.layout.extraCurrentState.enabled = Boolean(e.target.checked);
                return next;
              })}
              style={{ ...checkboxStyle, backgroundColor: a3.layout.extraCurrentState.enabled ? 'var(--accent-highlight)' : 'transparent', border: '2px solid var(--accent)' }}
            />
            <span style={{ fontSize: 12, color: '#555' }}>Additional Comments</span>
          </label>
          {a3.layout?.extraCurrentState?.enabled && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Additional Comments</label>
              <div style={{ border: '1px solid var(--main)', borderRadius: 6, padding: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '24vh', overflow: 'auto', marginBottom: 8 }}>
                  {(Array.isArray(a3.layout?.extraCurrentState?.text) && a3.layout.extraCurrentState.text.length > 0) ? (
                    a3.layout.extraCurrentState.text.map((entry, idx) => {
                      let comment = null;
                      if (entry && typeof entry === 'object' && entry.text) {
                        comment = entry;
                      } else if (typeof entry === 'string') {
                        const m = String(entry).match(/^(.+?)\s*\(([^)]+)\):\s*(.*)$/);
                        const parsedAuthorDisplay = m ? m[1].trim() : null;
                        const parsedWhenRaw = m ? m[2] : null;
                        const parsedText = m ? m[3] : entry;
                        // try to convert legacy locale date to ISO
                        let parsedWhen = null;
                        if (parsedWhenRaw) {
                          const dt = new Date(parsedWhenRaw);
                          if (!isNaN(dt)) parsedWhen = dt.toISOString();
                        }
                        comment = { author: null, authorDisplay: parsedAuthorDisplay || null, date: parsedWhen || null, text: parsedText };
                      } else {
                        comment = { author: null, authorDisplay: null, date: null, text: String(entry ?? '') };
                      }

                      const canDelete = (a3?.header?.owner === user) || (comment.author && comment.author === user);
                      const label = comment.authorDisplay ? `${comment.authorDisplay}${comment.date ? ` (${formatCommentTimestamp(comment.date)})` : ''}` : null;
                      return (
                        <div key={`cs-comment-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'white', padding: '6px 8px', borderRadius: 6 }}>
                          <div style={{ fontSize: 13, color: '#222', wordBreak: 'break-word', flex: 1 }}>{label ? `${label}: ${comment.text}` : comment.text}</div>
                          {canDelete && (
                            <button aria-label={`Delete comment ${idx}`} onClick={() => {
                              setA3(prev => {
                                const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                                next.layout = next.layout || {};
                                next.layout.extraCurrentState = next.layout.extraCurrentState || {};
                                next.layout.extraCurrentState.text = Array.isArray(next.layout.extraCurrentState.text) ? next.layout.extraCurrentState.text.slice() : [];
                                next.layout.extraCurrentState.text.splice(idx, 1);
                                return next;
                              });
                            }} style={{ marginLeft: 8, background: 'transparent', border: '1px solid rgba(0,0,0,0.06)', padding: '6px', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#666', fontSize: 13 }}>No comments yet</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newCurrentComment}
                    onChange={e => setNewCurrentComment(e.target.value)}
                    placeholder="Write a comment..."
                    style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.08)' }}
                  />
                  <button
                    onClick={() => {
                      const text = String(newCurrentComment || '').trim();
                      if (!text) return;
                      const authorRaw = user || null;
                      const whenIso = new Date().toISOString();
                      const formattedAuthor = authorRaw ? toInitialLast(authorRaw) : null;
                      const obj = { author: authorRaw, authorDisplay: formattedAuthor, date: whenIso, text };
                      setA3(prev => {
                        const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                        next.layout = next.layout || {};
                        next.layout.extraCurrentState = next.layout.extraCurrentState || {};
                        next.layout.extraCurrentState.text = Array.isArray(next.layout.extraCurrentState.text) ? next.layout.extraCurrentState.text.slice() : [];
                        next.layout.extraCurrentState.text.push(obj);
                        return next;
                      });
                      setNewCurrentComment('');
                    }}
                    style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--main)', color: 'white', border: 'none', cursor: 'pointer' }}
                    disabled={!newCurrentComment.trim()}
                  >Add</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
