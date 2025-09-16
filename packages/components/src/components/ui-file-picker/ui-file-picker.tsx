import { Component, Element, Prop, State, Event, EventEmitter, Method, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * A file picker component for selecting and uploading files.
 * Provides drag and drop functionality with visual feedback and file validation.
 *
 * @example Basic Usage
 * ```html
 * <ui-file-picker label="Upload Document" accept=".pdf,.doc,.docx"></ui-file-picker>
 * ```
 *
 * @example Multiple Files
 * ```html
 * <ui-file-picker multiple="true" label="Select Images" accept="image/*"></ui-file-picker>
 * ```
 *
 * @example JavaScript Integration
 * ```javascript
 * const filePicker = document.querySelector('#file-upload');
 *
 * // Handle file selection
 * filePicker.addEventListener('valueMsg', (e) => {
 *   const files = e.detail.newVal;
 *   console.log('Files selected:', files);
 * });
 *
 * // Simple upload (just action)
 * await filePicker.setUpload(async (fileData) => {
 *   const result = await thing.invokeAction('upload-file', fileData);
 *   console.log('Upload result:', result);
 * });
 *
 * // Upload with property write
 * await filePicker.setUpload(async (fileData) => {
 *   const result = await thing.invokeAction('upload-file', fileData);
 *   console.log('Upload result:', result);
 * }, {
 *   propertyName: 'selectedFile',
 *   writeProperty: async (prop, value) => await thing.writeProperty(prop, value)
 * });
 * ```
 */
@Component({
  tag: 'ui-file-picker',
  styleUrl: 'ui-file-picker.css',
  shadow: true,
})
export class UiFilePicker {
  @Element() el: HTMLElement;

  /** Component props */

  /**
   * Whether the component is disabled.
   */
  @Prop() disabled: boolean = false;

  /**
   * Visual variant of the component.
   */
  @Prop() variant: 'outlined' | 'filled' = 'outlined';

  /**
   * Color scheme for the component.
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Dark theme support.
   */
  @Prop() dark: boolean = false;

  /**
   * Show last updated timestamp.
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Show status badge when true.
   */
  @Prop() showStatus: boolean = true;

  /**
   * Text label displayed above the file picker.
   */
  @Prop() label?: string;

  /**
   * File type restrictions (e.g., ".pdf,.doc", "image/*").
   */
  @Prop() accept?: string;

  /**
   * Whether multiple files can be selected.
   */
  @Prop() multiple: boolean = false;

  /**
   * Maximum file size in bytes.
   */
  @Prop() maxSize?: number;

  /**
   * Maximum number of files when multiple is true.
   */
  @Prop() maxFiles?: number;

  /** Component state */

  /** Selected files */
  @State() private selectedFiles: File[] = [];

  /** Operation status for unified status indicators */
  @State() operationStatus: OperationStatus = 'idle';

  /** Last error message (if any) */
  @State() lastError?: string;

  /** Timestamp of last value update */
  @State() lastUpdatedTs?: number;

  /** Drag over state for visual feedback */
  @State() private isDragOver: boolean = false;

  /** Stored upload operation for user interaction */
  private storedUploadOperation?: (files: File[]) => Promise<any>;

  /** File input reference */
  private fileInputRef?: HTMLInputElement;

  /** Component events */

  /**
   * Emitted when files are selected.
   */
  @Event() valueMsg: EventEmitter<UiMsg<File[]>>;

  /** Public methods */

  /**
   * Set the upload operation with WoT integration.
   * Files are automatically converted to base64 with metadata.
   * @param operation - Function that receives processed file data
   * @param options - Configuration options
   * @returns Promise that resolves to true if successful
   */
  @Method()
  async setUpload(
    operation: (fileData: { name: string; size: number; type: string; content: string }) => Promise<any>,
    options?: {
      propertyName?: string; // Property to write file metadata to
      writeProperty?: (propertyName: string, value: any) => Promise<void>; // Function to write properties
    },
  ): Promise<boolean> {
    this.storedUploadOperation = async (files: File[]) => {
      if (this.multiple) {
        // Handle multiple files
        const fileList = [];

        for (const file of files) {
          const content = await this.fileToBase64(file);
          const fileData = {
            name: file.name,
            size: file.size,
            type: file.type,
            content,
          };

          // Process each file
          await operation(fileData);

          // Add to file list for final property update
          fileList.push({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified || Date.now(),
          });
        }

        // Write final file list if specified (only once at the end)
        if (options?.writeProperty && options?.propertyName) {
          await options.writeProperty(options.propertyName, fileList);
        }
      } else {
        // Handle single file
        const file = files[0];
        const content = await this.fileToBase64(file);
        const fileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          content,
        };

        // Write to property first if specified
        if (options?.writeProperty && options?.propertyName) {
          const fileMetadata = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified || Date.now(),
          };
          await options.writeProperty(options.propertyName, fileMetadata);
        }

        // Then invoke operation
        await operation(fileData);
      }
    };
    return true;
  }

  /**
   * Get the currently selected files.
   * @returns Array of selected files
   */
  @Method()
  async getFiles(): Promise<File[]> {
    return this.selectedFiles;
  }

  /**
   * Clear the selected files.
   * @returns Promise that resolves when files are cleared
   */
  @Method()
  async clearFiles(): Promise<void> {
    this.selectedFiles = [];
    if (this.fileInputRef) {
      this.fileInputRef.value = '';
    }
    this.lastUpdatedTs = Date.now();
  }

  /**
   * Convert a file to base64 string.
   * @param file - The file to convert
   * @returns Promise that resolves to base64 content (without data URL prefix)
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the "data:mime/type;base64," prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /** Private methods */

  /**
   * Handle file selection from input or drag and drop.
   */
  private async handleFileSelection(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = this.validateFiles(fileArray);

    if (validFiles.length === 0) return;

    const prevFiles = [...this.selectedFiles];
    this.selectedFiles = validFiles;
    this.lastUpdatedTs = Date.now();

    // Emit event
    this.emitValueMsg(validFiles, prevFiles);

    // DON'T execute upload operation automatically - wait for user to click Upload button
    // Clear any previous status when new files are selected
    StatusIndicator.applyStatus(this, 'idle');
  }

  /**
   * Validate selected files against constraints.
   */
  private validateFiles(files: File[]): File[] {
    const validFiles: File[] = [];

    for (const file of files) {
      // Check file size
      if (this.maxSize && file.size > this.maxSize) {
        StatusIndicator.applyStatus(this, 'error', `File "${file.name}" exceeds size limit`);
        continue;
      }

      // Check file type
      if (this.accept && !this.isFileTypeAccepted(file)) {
        StatusIndicator.applyStatus(this, 'error', `File type not supported: ${file.name}`);
        continue;
      }

      validFiles.push(file);

      // Check max files limit
      if (this.maxFiles && validFiles.length >= this.maxFiles) {
        break;
      }
    }

    return validFiles;
  }

  /**
   * Check if file type is accepted.
   */
  private isFileTypeAccepted(file: File): boolean {
    if (!this.accept) return true;

    const acceptTypes = this.accept.split(',').map(type => type.trim().toLowerCase());
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    return acceptTypes.some(accept => {
      if (accept.startsWith('.')) {
        return fileName.endsWith(accept);
      }
      if (accept.includes('/*')) {
        const category = accept.split('/')[0];
        return fileType.startsWith(category + '/');
      }
      return fileType === accept;
    });
  }

  /**
   * Handle drag over event.
   */
  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled) {
      this.isDragOver = true;
    }
  }

  /**
   * Handle drag leave event.
   */
  private handleDragLeave(): void {
    this.isDragOver = false;
  }

  /**
   * Handle drop event.
   */
  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    if (this.disabled) return;

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFileSelection(files);
    }
  }

  /**
   * Handle file input change.
   */
  private handleInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.handleFileSelection(target.files);
  }

  /**
   * Open file dialog.
   */
  private openFileDialog(): void {
    if (this.disabled) return;
    this.fileInputRef?.click();
  }

  /** Click handler for drop zone to avoid opening from action buttons */
  private handleDropZoneClick(event: MouseEvent): void {
    if (this.disabled) return;
    const target = event.target as HTMLElement;
    if (target.closest('.file-actions')) return; // ignore clicks on action buttons area
    this.openFileDialog();
  }

  /**
   * Emit the valueMsg event with standardized format.
   */
  private emitValueMsg(newVal: File[], prevVal?: File[]): void {
    const msg: UiMsg<File[]> = {
      newVal,
      prevVal,
      ts: Date.now(),
      source: this.el.id || 'ui-file-picker',
      ok: true,
    };
    this.valueMsg.emit(msg);
  }

  /**
   * Format file size for display.
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ============================== RENDERING HELPERS ==============================

  /** Renders the status badge according to current operation state */
  private renderStatusBadge() {
    if (!this.showStatus) return null;

    const status = this.operationStatus || 'idle';
    const message = this.lastError || (status === 'idle' ? 'Ready' : '');
    return StatusIndicator.renderStatusBadge(status, message, h);
  }

  /** Renders the last updated timestamp */
  private renderLastUpdated() {
    if (!this.showLastUpdated) return null;

    // render an invisible placeholder when lastUpdatedTs is missing.
    const lastUpdatedDate = this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  /** Render method */

  render() {
    const canInteract = !this.disabled;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'File Picker'}>
        <div class="space-y-2">
          {/* Label */}
          {this.label && (
            <label
              class={`block text-sm font-medium transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'text-gray-700 dark:text-gray-300'} ${
                this.dark ? 'text-white' : 'text-gray-900'
              }`}
              part="label"
            >
              {this.label}
            </label>
          )}

          <div class="inline-flex items-center space-x-2 relative">
            {/* File Drop Zone */}
            <div
              class={`file-picker-drop-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 transition-all duration-200 ${
                this.isDragOver ? 'drag-over border-blue-400 bg-blue-50' : ''
              } ${canInteract ? 'hover:border-gray-400 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              onDragOver={e => canInteract && this.handleDragOver(e)}
              onDragLeave={() => canInteract && this.handleDragLeave()}
              onDrop={e => canInteract && this.handleDrop(e)}
              onClick={e => canInteract && this.handleDropZoneClick(e)}
              part="drop-zone"
            >
              <input
                ref={el => (this.fileInputRef = el)}
                type="file"
                class="file-picker-input"
                style={{ display: 'none' }}
                accept={this.accept}
                multiple={this.multiple}
                disabled={this.disabled}
                onChange={e => this.handleInputChange(e)}
                part="file-input"
              />

              <div class="flex flex-col items-center gap-3">
                <div class="w-12 h-12 flex items-center justify-center text-gray-400">
                  {this.selectedFiles.length > 0 ? (
                    <svg width="19" height="14" viewBox="0 0 19 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M2.97378 5.9957L0.201904 10.7457V2.00195C0.201904 0.898828 1.09878 0.00195312 2.2019 0.00195312H5.87378C6.40503 0.00195312 6.9144 0.211328 7.2894 0.586328L8.11753 1.41445C8.49253 1.78945 9.0019 1.99883 9.53315 1.99883H13.2019C14.305 1.99883 15.2019 2.8957 15.2019 3.99883V4.99883H4.7019C3.9894 4.99883 3.33315 5.37695 2.97378 5.99258V5.9957ZM3.83628 6.49883C4.01753 6.18945 4.34565 6.00195 4.7019 6.00195H17.2019C17.5613 6.00195 17.8894 6.19258 18.0675 6.50508C18.2457 6.81758 18.2457 7.19883 18.0644 7.5082L14.5644 13.5082C14.3863 13.8145 14.0582 14.002 13.7019 14.002H1.2019C0.842529 14.002 0.514404 13.8113 0.336279 13.4988C0.158154 13.1863 0.158154 12.8051 0.339404 12.4957L3.8394 6.4957L3.83628 6.49883Z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M8.56404 0.294922C8.17341 -0.0957031 7.53904 -0.0957031 7.14841 0.294922L3.14841 4.29492C2.75779 4.68555 2.75779 5.31992 3.14841 5.71055C3.53904 6.10117 4.17341 6.10117 4.56404 5.71055L6.85779 3.4168V10.0012C6.85779 10.5543 7.30466 11.0012 7.85779 11.0012C8.41091 11.0012 8.85779 10.5543 8.85779 10.0012V3.4168L11.1515 5.71055C11.5422 6.10117 12.1765 6.10117 12.5672 5.71055C12.9578 5.31992 12.9578 4.68555 12.5672 4.29492L8.56716 0.294922H8.56404ZM2.85779 11.0012C2.85779 10.448 2.41091 10.0012 1.85779 10.0012C1.30466 10.0012 0.857788 10.448 0.857788 11.0012V13.0012C0.857788 14.6574 2.20154 16.0012 3.85779 16.0012H11.8578C13.514 16.0012 14.8578 14.6574 14.8578 13.0012V11.0012C14.8578 10.448 14.4109 10.0012 13.8578 10.0012C13.3047 10.0012 12.8578 10.448 12.8578 11.0012V13.0012C12.8578 13.5543 12.4109 14.0012 11.8578 14.0012H3.85779C3.30466 14.0012 2.85779 13.5543 2.85779 13.0012V11.0012Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </div>

                {this.selectedFiles.length > 0 ? (
                  <div class="flex flex-col items-center gap-2">
                    <div class="font-medium text-gray-700 dark:text-gray-300">
                      {this.selectedFiles.length} file{this.selectedFiles.length !== 1 ? 's' : ''} selected
                    </div>
                    {canInteract && (
                      <div class="file-actions flex gap-2">
                        <button
                          class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            this.handleUpload();
                          }}
                          part="upload-button"
                        >
                          Upload
                        </button>
                        <button
                          class="px-3 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            this.clearFiles();
                          }}
                          part="clear-button"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div class="text-center">
                    <div class="font-medium text-gray-700 dark:text-gray-300">{canInteract ? 'Click to select files or drag and drop' : 'No files selected'}</div>
                    {this.accept && <div class="text-xs text-gray-500 mt-1">Accepted types: {this.accept}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {this.renderStatusBadge()}
          </div>

          {/* File List */}
          {this.selectedFiles.length > 0 && (
            <div class="mt-3 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-800">
              {this.selectedFiles.map((file, index) => (
                <div key={index} class="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-600 last:border-0">
                  <span class="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{file.name}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{this.formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last Updated Timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }

  /**
   * Handle upload button click.
   */
  private async handleUpload(): Promise<void> {
    if (this.selectedFiles.length === 0 || !this.storedUploadOperation) return;

    try {
      StatusIndicator.applyStatus(this, 'loading');
      await this.storedUploadOperation(this.selectedFiles);
      StatusIndicator.applyStatus(this, 'success');
    } catch (error: any) {
      StatusIndicator.applyStatus(this, 'error', error?.message || 'Upload failed');
    }
  }
}
