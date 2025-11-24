'use client';

import React from "react";

/**
 * Reusable text input component with customizable size and colors.
 *
 * Props:
 * - value: string
 * - onChange: function
 * - width: string (e.g. '200px', '100%')
 * - height: string (e.g. '40px', '2em')
 * - borderColor: string (CSS color)
 * - bgColor: string (CSS color)
 * - hoverColor: string (CSS color)
 * - ...rest: other input props
 */
export default function InputText({
    id,
    value,
    onChange,
    width = "100%",
    height = "2.5em",
    borderColor = "var(--main)",
    bgColor = "white",
    hoverColor = "white",
    style = {},
    placeholder = "Enter text...",
    min,
    max,
    ...rest
}) {
    const [isHovered, setIsHovered] = React.useState(false);

    // If `options` is provided, render a select element
    const options = rest.options;

    const baseStyle = {
        width,
        height: height,
        border: `1px solid ${borderColor}`,
        background: isHovered ? hoverColor : bgColor,
        borderRadius: "6px",
        padding: "0.25em 0.75em",
        fontSize: "1em",
        transition: "background 0.2s, border-color 0.2s",
        boxSizing: "border-box",
        color: 'black',
        ...style,
    };

    if (options && Array.isArray(options)) {
        return (
            <select
                id={id}
                value={value}
                onChange={onChange}
                style={baseStyle}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                {...rest}
                placeholder={placeholder}
            >
                {options.map((opt, i) => {
                    // Support simple string options or objects with { value, label, disabled, title }
                    if (typeof opt === 'string') return <option key={i} value={opt}>{opt}</option>;
                    const disabled = Boolean(opt.disabled);
                    const title = opt.title || undefined;
                    return <option key={i} value={opt.value} disabled={disabled} title={title}>{opt.label ?? opt.value}</option>;
                })}
            </select>
        );
    }
    const handleChange = (e) => {
        if (!onChange) return;
        const isNumberType = (rest.type === 'number') || (rest.inputMode === 'numeric') || (rest.inputMode === 'decimal');
        if (isNumberType && (min !== undefined || max !== undefined)) {
            const raw = e?.target?.value ?? '';
            if (raw === '') {
                // forward empty
                onChange({ target: { value: '' } });
                return;
            }
            const parsed = parseFloat(raw);
            if (Number.isNaN(parsed)) {
                // forward as-is
                onChange(e);
                return;
            }
            let clamped = parsed;
            if (min !== undefined) clamped = Math.max(Number(min), clamped);
            if (max !== undefined) clamped = Math.min(Number(max), clamped);
            // If clamped differs, forward the clamped value, else forward original event
            if (clamped !== parsed) {
                onChange({ target: { value: String(clamped) } });
            } else {
                onChange(e);
            }
            return;
        }

        onChange(e);
    };

    return (
        <input
            id={id}
            type={rest.type || 'text'}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            style={baseStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            min={min}
            max={max}
            {...rest}
        />
    );
}
