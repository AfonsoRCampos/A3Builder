'use client';

import React from "react";

export default function SubmitButton({
  children = "Submit",
  onClick,
  width = "100%",
  height = "2.5em",
  borderColor = 'var(--main)',
  textColor = "white",
  bgColor = "white",
  hoverColor = "white",
  style = {},
  ...rest
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      type="submit"
      onClick={onClick}
      style={{
        width,
        height,
        color: textColor,
        border: `1px solid ${borderColor}`,
        background: isHovered ? hoverColor : bgColor,
        borderRadius: "6px",
        fontSize: "1em",
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
        boxSizing: "border-box",
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...rest}
    >
      {children}
    </button>
  );
}
