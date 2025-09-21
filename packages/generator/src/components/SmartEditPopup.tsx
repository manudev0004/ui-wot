import { useEffect, useRef, useState, useCallback } from 'react';
import { WoTComponent, ParsedAffordance } from '../types';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import './SmartEditPopup.css';

interface SmartEditPopupPropsBase {
  onClose: () => void;
}

interface ComponentModeProps extends SmartEditPopupPropsBase {
  mode: 'component';
  component: WoTComponent;
  affordance: ParsedAffordance | undefined;
  attributesList: string[];
  attributesValues: Record<string, string>;
  attributesTypes: Record<string, 'string' | 'number' | 'boolean'>;
  onAttributeChange: (componentId: string, attrName: string, value: string) => void;
  onVariantChange: (componentId: string, variant: string) => void;
  onComponentClose: (componentId: string) => void;
}

interface SectionModeProps extends SmartEditPopupPropsBase {
  mode: 'section';
  sectionId: string;
  sectionName: string;
  sectionStyles: { bgColor: string; border: 'dashed' | 'solid' | 'none' };
  onSectionChange: (sectionId: string, updates: { name?: string; styles?: { bgColor?: string; border?: 'dashed' | 'solid' | 'none' } }) => void;
  onBulkAction: (sectionId: string, action: 'hideWrappers' | 'showWrappers' | 'setVariant', payload?: { variant?: string }) => void;
}

type SmartEditPopupProps = ComponentModeProps | SectionModeProps;

interface PopupPosition {
  top: number;
  left: number;
  placement: 'left' | 'right' | 'top' | 'bottom';
}

export function SmartEditPopup(props: SmartEditPopupProps) {
  const { dispatch } = useAppContext();
  const { theme } = useTheme();
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopupPosition>({ top: 0, left: 0, placement: 'right' });
  const [isVisible, setIsVisible] = useState(false);

  const calculateOptimalPosition = useCallback(() => {
    const anchor: HTMLElement | null =
      props.mode === 'component'
        ? (document.querySelector(`[data-component-id="${props.component.id}"]`) as HTMLElement)
        : (document.querySelector(`[data-section-id="${props.sectionId}"]`) as HTMLElement);
    if (!anchor || !popupRef.current) return;

    const componentRect = anchor.getBoundingClientRect();
    const popupRect = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Popup dimensions (estimated if not rendered yet)
    const popupWidth = popupRect.width || 350;
    const popupHeight = popupRect.height || 600;

    // Calculate available space in each direction
    const spaceRight = viewportWidth - (componentRect.right + 16);
    const spaceLeft = componentRect.left - 16;
    const spaceBottom = viewportHeight - (componentRect.bottom + 16);

    let placement: 'left' | 'right' | 'top' | 'bottom' = 'right';
    let top = 0;
    let left = 0;

    // Priority: right > left > bottom > top
    if (spaceRight >= popupWidth) {
      // Place to the right
      placement = 'right';
      left = componentRect.right + 16 + scrollX;
      top = Math.max(16, Math.min(componentRect.top + scrollY, viewportHeight - popupHeight - 16 + scrollY));
    } else if (spaceLeft >= popupWidth) {
      // Place to the left
      placement = 'left';
      left = componentRect.left - popupWidth - 16 + scrollX;
      top = Math.max(16, Math.min(componentRect.top + scrollY, viewportHeight - popupHeight - 16 + scrollY));
    } else if (spaceBottom >= popupHeight) {
      // Place below
      placement = 'bottom';
      left = Math.max(16, Math.min(componentRect.left + scrollX, viewportWidth - popupWidth - 16 + scrollX));
      top = componentRect.bottom + 16 + scrollY;
    } else {
      // Place above (fallback)
      placement = 'top';
      left = Math.max(16, Math.min(componentRect.left + scrollX, viewportWidth - popupWidth - 16 + scrollX));
      top = Math.max(16, componentRect.top - popupHeight - 16 + scrollY);
    }

    setPosition({ top, left, placement });
  }, [props]);

  // Calculate position on mount and when component layout changes
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateOptimalPosition();
      setIsVisible(true);
    }, 50);

    // Recalculate on window resize and scroll
    const handleResize = () => calculateOptimalPosition();
    const handleScroll = () => calculateOptimalPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [calculateOptimalPosition]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        const targetElement = event.target as HTMLElement;
        // Don't close if clicking on the component being edited
        if (props.mode === 'component' && targetElement.closest(`[data-component-id="${props.component.id}"]`)) {
          return;
        }
        props.onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [props]);

  return (
    <>
      {/* Backdrop for better visual separation */}
      <div
        className="smart-popup-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)',
          zIndex: 998,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      />

      {/* Popup Container */}
      <div
        ref={popupRef}
        className={`smart-edit-popup smart-edit-popup--${position.placement} ${theme === 'dark' ? 'smart-edit-popup--dark' : ''}`}
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 999,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
        }}
      >
        {/* Header */}
        <div className="smart-popup-header">
          <div className="smart-popup-title">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>{props.mode === 'component' ? 'Edit Component' : 'Edit Section'}</span>
          </div>
          <button onClick={props.onClose} className="smart-popup-close" aria-label="Close editor">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="smart-popup-content">
          {props.mode === 'component' ? (
            <>
              {/* Basic Settings */}
              <div className="smart-popup-section">
                <h5 className="smart-popup-section-title">Basic Settings</h5>
                <div className="smart-popup-field">
                  <label className="smart-popup-label">Title</label>
                  <input
                    type="text"
                    value={props.component.title}
                    onChange={e => {
                      const next = e.target.value;
                      dispatch({ type: 'UPDATE_COMPONENT', payload: { id: props.component.id, updates: { title: next } } });
                      props.onAttributeChange(props.component.id, 'label', next);
                    }}
                    className="smart-popup-input"
                  />
                </div>
                <div className="smart-popup-field">
                  <label className="smart-popup-label">Variant</label>
                  <select value={props.component.variant || 'minimal'} onChange={e => props.onVariantChange(props.component.id, e.target.value)} className="smart-popup-select">
                    {props.affordance?.availableVariants.map(variant => (
                      <option key={variant} value={variant}>
                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="smart-popup-field">
                  <label className="smart-popup-checkbox-label">
                    <input
                      type="checkbox"
                      checked={props.component.hideCard || false}
                      onChange={e => {
                        dispatch({ type: 'UPDATE_COMPONENT', payload: { id: props.component.id, updates: { hideCard: e.target.checked } } });
                      }}
                      className="smart-popup-checkbox"
                    />
                    <span>Hide card wrapper</span>
                  </label>
                  <p className="smart-popup-description">Show only the component without card border</p>
                </div>
              </div>
              {/* Layout */}
              <div className="smart-popup-section">
                <h5 className="smart-popup-section-title">Layout</h5>
                <div className="smart-popup-row">
                  <div className="smart-popup-field smart-popup-field--half">
                    <label className="smart-popup-label">Width</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={props.component.layout.w}
                      onChange={e =>
                        dispatch({ type: 'UPDATE_LAYOUT', payload: { id: props.component.id, layout: { ...props.component.layout, w: parseInt(e.target.value) || 1 } } })
                      }
                      className="smart-popup-input smart-popup-input--small"
                    />
                  </div>
                  <div className="smart-popup-field smart-popup-field--half">
                    <label className="smart-popup-label">Height</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={props.component.layout.h}
                      onChange={e =>
                        dispatch({ type: 'UPDATE_LAYOUT', payload: { id: props.component.id, layout: { ...props.component.layout, h: parseInt(e.target.value) || 1 } } })
                      }
                      className="smart-popup-input smart-popup-input--small"
                    />
                  </div>
                </div>
              </div>
              {/* Attributes */}
              {props.attributesList.length > 0 && (
                <div className="smart-popup-section">
                  <h5 className="smart-popup-section-title">Attributes</h5>
                  <div className="smart-popup-attributes">
                    {props.attributesList.map(name => {
                      const attrType = props.attributesTypes[name];
                      const currentValue = props.attributesValues[name] ?? '';
                      return (
                        <div key={name} className="smart-popup-field">
                          <label className="smart-popup-label">{name.replace(/([A-Z])/g, ' $1').trim()}</label>
                          {attrType === 'boolean' ? (
                            <div className="smart-popup-checkbox-wrapper">
                              <input
                                type="checkbox"
                                checked={currentValue === 'true'}
                                onChange={e => props.onAttributeChange(props.component.id, name, e.target.checked ? 'true' : 'false')}
                                className="smart-popup-checkbox"
                              />
                              <span className="smart-popup-checkbox-status">{currentValue === 'true' ? 'Enabled' : 'Disabled'}</span>
                            </div>
                          ) : attrType === 'number' ? (
                            <input
                              type="number"
                              value={currentValue}
                              onChange={e => props.onAttributeChange(props.component.id, name, e.target.value)}
                              className="smart-popup-input smart-popup-input--small"
                              step={name === 'step' ? '0.01' : '1'}
                            />
                          ) : name === 'color' ? (
                            <select value={currentValue} onChange={e => props.onAttributeChange(props.component.id, name, e.target.value)} className="smart-popup-select">
                              <option value="primary">Primary</option>
                              <option value="secondary">Secondary</option>
                              <option value="neutral">Neutral</option>
                              <option value="success">Success</option>
                            </select>
                          ) : name === 'orientation' ? (
                            <select value={currentValue} onChange={e => props.onAttributeChange(props.component.id, name, e.target.value)} className="smart-popup-select">
                              <option value="horizontal">Horizontal</option>
                              <option value="vertical">Vertical</option>
                            </select>
                          ) : name === 'thumbShape' ? (
                            <select value={currentValue} onChange={e => props.onAttributeChange(props.component.id, name, e.target.value)} className="smart-popup-select">
                              <option value="circle">Circle</option>
                              <option value="square">Square</option>
                              <option value="arrow">Arrow</option>
                              <option value="triangle">Triangle</option>
                              <option value="diamond">Diamond</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={currentValue}
                              onChange={e => props.onAttributeChange(props.component.id, name, e.target.value)}
                              className="smart-popup-input"
                              placeholder={name === 'placeholder' ? 'Enter placeholder text...' : ''}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Actions */}
              <div className="smart-popup-section">
                <button onClick={() => props.onComponentClose(props.component.id)} className="smart-popup-remove-btn">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove Component
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Section Settings */}
              <div className="smart-popup-section">
                <h5 className="smart-popup-section-title">Section Settings</h5>
                <div className="smart-popup-field">
                  <label className="smart-popup-label">Name</label>
                  <input type="text" value={props.sectionName} onChange={e => props.onSectionChange(props.sectionId, { name: e.target.value })} className="smart-popup-input" />
                </div>
                <div className="smart-popup-row">
                  <div className="smart-popup-field smart-popup-field--half">
                    <label className="smart-popup-label">Background</label>
                    <select
                      value={props.sectionStyles.bgColor}
                      onChange={e => props.onSectionChange(props.sectionId, { styles: { bgColor: e.target.value } })}
                      className="smart-popup-select"
                    >
                      <option value="transparent">Transparent</option>
                      <option value="#ffffff">White</option>
                      <option value="#f8fafc">Gray 50</option>
                      <option value="#eff6ff">Blue 50</option>
                      <option value="#ecfdf5">Green 50</option>
                      <option value="#fffbeb">Yellow 50</option>
                    </select>
                  </div>
                  <div className="smart-popup-field smart-popup-field--half">
                    <label className="smart-popup-label">Border</label>
                    <select
                      value={props.sectionStyles.border}
                      onChange={e => props.onSectionChange(props.sectionId, { styles: { border: e.target.value as any } })}
                      className="smart-popup-select"
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Bulk Actions */}
              <div className="smart-popup-section">
                <h5 className="smart-popup-section-title">Bulk Actions</h5>
                <div className="smart-popup-row">
                  <button className="smart-popup-btn" onClick={() => props.onBulkAction(props.sectionId, 'hideWrappers')}>
                    Hide all wrappers
                  </button>
                  <button className="smart-popup-btn" onClick={() => props.onBulkAction(props.sectionId, 'showWrappers')}>
                    Show all wrappers
                  </button>
                </div>
                <div className="smart-popup-field">
                  <label className="smart-popup-label">Set Variant for all</label>
                  <div className="smart-popup-row">
                    <input
                      type="text"
                      placeholder="e.g. minimal | outlined | filled"
                      className="smart-popup-input"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) props.onBulkAction(props.sectionId, 'setVariant', { variant: value });
                        }
                      }}
                    />
                    <button
                      className="smart-popup-btn"
                      onClick={() => {
                        const input = (popupRef.current?.querySelector('input[placeholder^="e.g."]') as HTMLInputElement) || null;
                        const value = input?.value.trim();
                        if (value) props.onBulkAction(props.sectionId, 'setVariant', { variant: value });
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  <p className="smart-popup-description">Applies to all components in this section. Variants not supported by a component may be ignored.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Popup Arrow */}
        <div className={`smart-popup-arrow smart-popup-arrow--${position.placement}`} />
      </div>
    </>
  );
}
