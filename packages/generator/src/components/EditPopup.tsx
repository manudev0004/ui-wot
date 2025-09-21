import { useEffect, useRef, useState, useCallback } from 'react';
import { WoTComponent, ParsedAffordance } from '../types';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AttributeSchema } from '../pages/canvas/attributeSchemas';

interface EditPopupPropsBase {
  onClose: () => void;
}

interface ComponentModeProps extends EditPopupPropsBase {
  mode: 'component';
  component: WoTComponent;
  affordance: ParsedAffordance | undefined;
  attributesList: string[];
  attributesValues: Record<string, string>;
  attributesTypes: Record<string, AttributeSchema>;
  onAttributeChange: (componentId: string, attrName: string, value: string) => void;
  onVariantChange: (componentId: string, variant: string) => void;
  onComponentClose: (componentId: string) => void;
}

interface SectionModeProps extends EditPopupPropsBase {
  mode: 'section';
  sectionId: string;
  sectionName: string;
  sectionStyles: { bgColor: string; border: 'dashed' | 'solid' | 'none' };
  onSectionChange: (sectionId: string, updates: { name?: string; styles?: { bgColor?: string; border?: 'dashed' | 'solid' | 'none' } }) => void;
  onBulkAction: (sectionId: string, action: 'hideWrappers' | 'showWrappers' | 'setVariant', payload?: { variant?: string }) => void;
}

type EditPopupProps = ComponentModeProps | SectionModeProps;

interface PopupPosition {
  top: number;
  left: number;
  placement: 'left' | 'right' | 'top' | 'bottom';
}

export function EditPopup(props: EditPopupProps) {
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
    // Using fixed positioning for the popup, so coordinates are viewport-relative

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
      left = componentRect.right + 16;
      top = Math.max(16, Math.min(componentRect.top, viewportHeight - popupHeight - 16));
    } else if (spaceLeft >= popupWidth) {
      // Place to the left
      placement = 'left';
      left = componentRect.left - popupWidth - 16;
      top = Math.max(16, Math.min(componentRect.top, viewportHeight - popupHeight - 16));
    } else if (spaceBottom >= popupHeight) {
      // Place below
      placement = 'bottom';
      left = Math.max(16, Math.min(componentRect.left, viewportWidth - popupWidth - 16));
      top = componentRect.bottom + 16;
    } else {
      // Place above (fallback)
      placement = 'top';
      left = Math.max(16, Math.min(componentRect.left, viewportWidth - popupWidth - 16));
      top = Math.max(16, componentRect.top - popupHeight - 16);
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] transition-opacity duration-200"
        style={{
          backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      />

      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed z-[999] w-[350px] max-h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200"
        style={{
          top: position.top,
          left: position.left,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-gray-100">
            <svg className="w-4 h-4" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>{props.mode === 'component' ? 'Edit Component' : 'Edit Section'}</span>
          </div>
          <button
            onClick={props.onClose}
            className="flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close editor"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[520px] overflow-y-auto">
          {props.mode === 'component' ? (
            <>
              {/* Basic */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">Basic Settings</h5>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={props.component.title}
                    onChange={e => {
                      const next = e.target.value;
                      dispatch({ type: 'UPDATE_COMPONENT', payload: { id: props.component.id, updates: { title: next } } });
                      props.onAttributeChange(props.component.id, 'label', next);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-md transition-colors"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: theme === 'dark' ? '#374151' : 'white',
                      color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                    }}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Variant</label>
                  <select
                    value={props.component.variant || 'minimal'}
                    onChange={e => props.onVariantChange(props.component.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md cursor-pointer transition-colors"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: theme === 'dark' ? '#374151' : 'white',
                      color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                    }}
                  >
                    {props.affordance?.availableVariants.map(variant => (
                      <option key={variant} value={variant}>
                        {String(variant).charAt(0).toUpperCase() + String(variant).slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={props.component.hideCard || false}
                      onChange={e => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: props.component.id, updates: { hideCard: e.target.checked } } })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    Hide card wrapper
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">Show only the component without card border</p>
                </div>
              </div>
              {/* Layout */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">Layout</h5>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Width</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={props.component.layout.w}
                      onChange={e =>
                        dispatch({ type: 'UPDATE_LAYOUT', payload: { id: props.component.id, layout: { ...props.component.layout, w: parseInt(e.target.value) || 1 } } })
                      }
                      className="w-full px-3 py-2 text-sm border rounded-md"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: theme === 'dark' ? '#374151' : 'white',
                        color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Height</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={props.component.layout.h}
                      onChange={e =>
                        dispatch({ type: 'UPDATE_LAYOUT', payload: { id: props.component.id, layout: { ...props.component.layout, h: parseInt(e.target.value) || 1 } } })
                      }
                      className="w-full px-3 py-2 text-sm border rounded-md"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: theme === 'dark' ? '#374151' : 'white',
                        color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Attributes */}
              {props.attributesList.length > 0 && (
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                  <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">Attributes</h5>
                  <div className="space-y-3">
                    {props.attributesList.map(name => {
                      const attrType = props.attributesTypes[name];
                      const currentValue = props.attributesValues[name] ?? '';
                      const displayLabel = attrType.description ? attrType.description : name.replace(/([A-Z])/g, ' $1').trim();
                      return (
                        <div key={name}>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 capitalize">{displayLabel}</label>
                          {attrType.type === 'boolean' ? (
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentValue === 'true'}
                                onChange={e => props.onAttributeChange(props.component.id, name, e.target.checked ? 'true' : 'false')}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                                style={{ accentColor: 'var(--color-primary)' }}
                              />
                              <span className="text-xs text-gray-500 dark:text-gray-400">{currentValue === 'true' ? 'enabled' : 'disabled'}</span>
                            </label>
                          ) : attrType.type === 'number' ? (
                            <input
                              type="number"
                              value={currentValue}
                              onChange={e => props.onAttributeChange(props.component.id, name, e.target.value)}
                              className="w-full px-3 py-2 text-sm border rounded-md"
                              style={{
                                borderColor: 'var(--color-border)',
                                backgroundColor: theme === 'dark' ? '#374151' : 'white',
                                color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                              }}
                              step={name === 'step' ? '0.01' : '1'}
                            />
                          ) : attrType.type === 'enum' && attrType.options ? (
                            <select
                              value={currentValue}
                              onChange={e => props.onAttributeChange(props.component.id, name, e.target.value)}
                              className="w-full px-3 py-2 text-sm border rounded-md cursor-pointer"
                              style={{
                                borderColor: 'var(--color-border)',
                                backgroundColor: theme === 'dark' ? '#374151' : 'white',
                                color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                              }}
                            >
                              {attrType.options.map(option => (
                                <option key={option} value={option}>
                                  {option.charAt(0).toUpperCase() + option.slice(1)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={currentValue}
                              onChange={e => props.onAttributeChange(props.component.id, name, e.target.value)}
                              className="w-full px-3 py-2 text-sm border rounded-md"
                              style={{
                                borderColor: 'var(--color-border)',
                                backgroundColor: theme === 'dark' ? '#374151' : 'white',
                                color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                              }}
                              placeholder={attrType.description || `Enter ${name}...`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Actions */}
              <div className="p-5">
                <button
                  onClick={() => props.onComponentClose(props.component.id)}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
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
              {/* Section */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">Section Settings</h5>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={props.sectionName}
                    onChange={e => props.onSectionChange(props.sectionId, { name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: theme === 'dark' ? '#374151' : 'white',
                      color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Background</label>
                    <select
                      value={props.sectionStyles.bgColor}
                      onChange={e => props.onSectionChange(props.sectionId, { styles: { bgColor: e.target.value } })}
                      className="w-full px-3 py-2 text-sm border rounded-md cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: theme === 'dark' ? '#374151' : 'white',
                        color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                      }}
                    >
                      <option value="transparent">Transparent</option>
                      <option value="#ffffff">White</option>
                      <option value="#f8fafc">Gray 50</option>
                      <option value="#eff6ff">Blue 50</option>
                      <option value="#ecfdf5">Green 50</option>
                      <option value="#fffbeb">Yellow 50</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Border</label>
                    <select
                      value={props.sectionStyles.border}
                      onChange={e => props.onSectionChange(props.sectionId, { styles: { border: e.target.value as any } })}
                      className="w-full px-3 py-2 text-sm border rounded-md cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: theme === 'dark' ? '#374151' : 'white',
                        color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                      }}
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Bulk */}
              <div className="p-5">
                <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">Bulk Actions</h5>
                <div className="flex gap-2 mb-4">
                  <button
                    className="flex-1 py-2 px-3 text-xs font-medium border rounded-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => props.onBulkAction(props.sectionId, 'hideWrappers')}
                    style={{
                      borderColor: 'var(--color-border)',
                      color: theme === 'dark' ? '#d1d5db' : '#374151',
                      backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                    }}
                  >
                    Hide all wrappers
                  </button>
                  <button
                    className="flex-1 py-2 px-3 text-xs font-medium border rounded-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => props.onBulkAction(props.sectionId, 'showWrappers')}
                    style={{
                      borderColor: 'var(--color-border)',
                      color: theme === 'dark' ? '#d1d5db' : '#374151',
                      backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                    }}
                  >
                    Show all wrappers
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Set all to variant</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 text-sm border rounded-md"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: theme === 'dark' ? '#374151' : 'white',
                        color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                      }}
                      onChange={e => {
                        if (e.target.value) {
                          props.onBulkAction(props.sectionId, 'setVariant', { variant: e.target.value });
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Choose variant...</option>
                      <option value="minimal">Minimal</option>
                      <option value="outlined">Outlined</option>
                      <option value="filled">Filled</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
