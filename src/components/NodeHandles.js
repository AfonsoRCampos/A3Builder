"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function NodeHandles() {
  return (
    <>
      {/* Handles */}
      <Handle type="source" position={Position.Top} id="top"  />
      <Handle type="source" position={Position.Right} id="right"  />
      <Handle type="source" position={Position.Bottom} id="bottom"  />
      <Handle type="source" position={Position.Left} id="left"  />
    </>
  );
}
