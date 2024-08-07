import { LitElement, html, PropertyValues, css, TemplateResult } from "lit";
import { property, customElement, state } from 'lit/decorators.js';
import "./components/ewt-button";
import "./components/ewt-checkbox";
import "./components/ewt-console";
import "./components/ewt-dialog";
import "./components/ewt-formfield";
import "./components/ewt-icon-button";
import "./components/ewt-textfield";
import "./components/ewt-select";
import "./components/ewt-list-item";
import "./pages/ewt-page-progress";
import "./pages/ewt-page-message";
import {
  closeIcon,
} from "./components/svg";
import { Logger, Manifest, FlashStateType, FlashState } from "./const.js";
import { flash } from "./flash";
import { textDownload } from "./util/file-download";
import { fireEvent } from "./util/fire-event";
import { sleep } from "./util/sleep";
import { downloadManifest } from "./util/manifest";
import { dialogStyles } from "./styles";
import { version } from "./version";

console.log(
  `ESP Web Tools ${version} by Nabu Casa; https://esphome.github.io/esp-web-tools/`,
);

const ERROR_ICON = "⚠️";
const OK_ICON = "🎉";

const domain = window.location.hostname.includes('devdashboard') ? 'devapi.opago-pay.com' : 'api.opago-pay.com';
const api_key = document.body.dataset.apiKey;
const wallet = document.body.dataset.wallet;

@customElement('ewt-install-dialog')
export class EwtInstallDialog extends LitElement {
  public port!: SerialPort;

  public manifestPath!: string;

  public logger: Logger = console;

  private _expertMode: boolean = false;

  private _manifest!: Manifest;

  @state() private _state:
    | "ERROR"
    | "DASHBOARD"
    | "PROVISION"
    | "INSTALL"
    | "CONFIGURE"
    | "ASK_ERASE"
    | "LOGS" = "DASHBOARD";

  @state() private _installErase = false;
  @state() private _installConfirmed = false;
  @state() private _installState?: FlashState;

  @state() private _error?: string;

  @state() private _currencies: string[] = [];

  @state() private _existingConfigs: any[] = [];

  // Global variable to store SSIDs
  @property({ type: Array })
  availableSSIDs: string[] = []; // Reactive property to store SSIDs

  @property({ type: Boolean, reflect: true }) scanningSSIDs = false;

  // Hardcoded currencies with EUR, USD, CHF at the beginning and also in their alphabetical place
  private async _fetchCurrencies() {
    this._currencies = ["EUR", "USD", "CHF", "sat", "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTN","BWP","BYN","BYR","BZD","CAD","CDF","CHF","CLF","CLP","CNH","CNY","COP","CRC","CUC","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","GBP","GEL","GGP","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","INR","IQD","IRT","ISK","JEP","JMD","JOD","JPY","KES","KGS","KHR","KMF","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRO","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SEK","SGD","SHP","SLL","SOS","SRD","SSP","STD","SVC","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS","UAH","UGX","USD","UYU","UZS","VEF","VES","VND","VUV","WST","XAF","XAG","XAU","XCD","XDR","XOF","XPD","XPF","XPT","YER","ZAR","ZMW","ZWL"];
  }

  private async _fetchConfigs() {
    try {
      const response = await fetch(`https://${domain}/lnurldevice/api/v1/lnurlpos?api-key=${api_key}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Store the entire configuration objects, not just the ids
      this._existingConfigs = await response.json();
    } catch (error) {
      console.error('Error fetching configurations:', error);
      alert('Connection to the server failed. Please check your internet connection and try again. If the problem reappears, contact support@opago-pay.com');
    }
  }

  private _handleConfigChange(event: Event) {
    const selectedConfigId = (event.target as HTMLSelectElement).value;
  
    // Fetch the selected configuration from the server
    const selectedConfig = this._existingConfigs.find(config => config.id === selectedConfigId);
  
    const titleInput = this.shadowRoot!.querySelector('#titleInput') as HTMLInputElement;
    const titleLabel = this.shadowRoot!.querySelector('#titleLabel') as HTMLDivElement;
    const currencySelect = this.shadowRoot!.querySelector('#fiatCurrency') as HTMLSelectElement;
    const currencyLabel = this.shadowRoot!.querySelector('#currencyLabel') as HTMLDivElement;
  
    // Check if the elements exist before trying to access their properties
    if (titleInput && titleLabel && currencySelect && currencyLabel) {
      // Hide the elements by default
      titleInput.style.display = 'none';
      titleLabel.style.display = 'none';
      currencySelect.style.display = 'none';
      currencyLabel.style.display = 'none';
  
      if (selectedConfigId === 'createNewDevice') {
        // Show the title and currency fields and labels for creating a new device
        titleInput.style.display = 'block';
        titleLabel.style.display = 'block';
        currencySelect.style.display = 'block';
        currencyLabel.style.display = 'block';
      } else if (selectedConfig) {
        // Set the apiKey.key and callbackUrl in the form fields
        const apiKeyInput = this.shadowRoot!.querySelector('input[name="apiKey.key"]') as HTMLInputElement;
        const callbackUrlInput = this.shadowRoot!.querySelector('input[name="callbackUrl"]') as HTMLInputElement;
  
        if (apiKeyInput && callbackUrlInput) {
          apiKeyInput.value = selectedConfig.apiKey;
          callbackUrlInput.value = selectedConfig.callbackUrl;
        }
      }
    }
  }
  
  private async _createNewDevice() {
    let title: string = '';
    let currency: string = '';
  
    let titleInput = this.shadowRoot!.querySelector('#titleInput') as HTMLInputElement;
    let currencySelect = this.shadowRoot!.querySelector('#fiatCurrency') as HTMLSelectElement;
  
    if (titleInput && currencySelect) {
      title = titleInput.value;
      currency = currencySelect.value;
    } else {
      console.error('titleInput or currencySelect element is not available');
      return;
    }
  
    const data = {
      "title": title,
      "wallet": wallet,
      "currency": currency,
      "device": "pos",
      "profit": 0,
      "switches": [
        {
          "amount": 0,
          "duration": 0,
          "pin": 0,
          "lnurl": ""
        }
      ]
    };
  
    const response = await fetch(`https://${domain}/lnurldevice/api/v1/lnurlpos?api-key=${api_key}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    const newDevice = await response.json();

    // Log the newDevice object to the console
    console.log(newDevice);
  
  // Once the new device is created, return an object with the necessary properties
  return {
    apiKey: newDevice.key, // replace 'apiKey' with the actual property name for the API key in the newDevice object
    callbackUrl: `https://${domain}/lnurldevice/api/v1/lnurl/${newDevice.id}`, // replace 'id' with the actual property name for the ID in the newDevice object
  };
}

  private async _handleSSIDClick(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      console.error("Failed to retrieve the select element.");
      return;
    }

    const isManualEntrySelected = target.value === "manual";
    const manualInputId = target.id === "wifiSSID" ? "manualSSID" : "manualSSID2";
    const manualInput = this.shadowRoot?.querySelector(`#${manualInputId}`) as HTMLInputElement | null;

    if (isManualEntrySelected) {
      if (manualInput) {
        manualInput.style.display = '';
      }
      target.style.display = 'none';
    } else {
      if (!this.scanningSSIDs) { // Check if scan is not already in progress
        await this._populateDropdownWithSSIDs();
      }
    }
  }

  private async _populateDropdownWithSSIDs() {
    if (!this.scanningSSIDs) {
      this.scanningSSIDs = true; // Set scanningSSIDs to true before starting the scan
      try {
        const response = await this._scanSSIDs();
        if (response && response.result) {
          const ssids = response.result; // Directly use the result array
          console.log('Parsed SSIDs:', ssids);

          if (ssids.length > 0) {
            this.availableSSIDs = Array.from(new Set([...this.availableSSIDs, ...ssids]));
            console.log('Updated SSIDs:', this.availableSSIDs);
            this.requestUpdate();
          } else {
            console.log('No new SSIDs found');
          }
        } else {
          console.log('Response did not contain SSIDs:', response);
        }
      } catch (error) {
        console.error("Failed to process SSIDs:", error);
      } finally {
        this.scanningSSIDs = false; // Set scanningSSIDs to false after the scan is complete
      }
    } else {
      console.log("SSID scan is already in progress.");
    }
  }

  protected render() {
    if (!this.port) {
      return html``;
    }
    let heading: string | undefined;
    let content: TemplateResult;
    let hideActions = false;
    let allowClosing = false;

    if (this._state === "INSTALL") {
      [heading, content, hideActions, allowClosing] = this._renderInstall();
    } else if (this._state === "ASK_ERASE") {
      [heading, content] = this._renderAskErase();
    } else if (this._state === "ERROR") {
      [heading, content, hideActions] = this._renderError(this._error!);
    } else if (this._state === "DASHBOARD") {
      [heading, content, hideActions, allowClosing] = this._renderDashboard();
    } else if (this._state === "CONFIGURE") {
      [heading, content, hideActions] = this._renderConfigure();
    } else if (this._state === "LOGS") {
      [heading, content, hideActions] = this._renderLogs();
    }

    return html`
      <ewt-dialog
        open
        .heading=${heading!}
        scrimClickAction
        @closed=${this._handleClose}
        .hideActions=${hideActions}
      >
        ${heading && allowClosing
          ? html`
              <ewt-icon-button dialogAction="close">
                ${closeIcon}
              </ewt-icon-button>
            `
          : ""}
        ${content!}
      </ewt-dialog>
    `;
  }

  _renderProgress(label: string | TemplateResult, progress?: number) {
    return html`
      <ewt-page-progress
        .label=${label}
        .progress=${progress}
      ></ewt-page-progress>
    `;
  }

  _renderError(label: string): [string, TemplateResult, boolean] {
    const heading = "Error";
    const content = html`
      <ewt-page-message .icon=${ERROR_ICON} .label=${label}></ewt-page-message>
      <ewt-button
        slot="primaryAction"
        dialogAction="ok"
        label="Close"
      ></ewt-button>
    `;
    const hideActions = false;
    return [heading, content, hideActions];
  }

  _renderDashboard(): [string, TemplateResult, boolean, boolean] {
    const heading = "Device Dashboard";
    let content: TemplateResult;
    let hideActions = true;
    let allowClosing = true;
  
    content = html`
      <div class="dashboard-buttons">
        <div>
          <ewt-button
            text-left
            .label=${`Install ${this._manifest.name}`}
            @click=${() => {
              if (this._manifest.new_install_prompt_erase) {
                this._state = "ASK_ERASE";
              } else {
                this._startInstall(true);
              }
            }}
          ></ewt-button>
        </div>
        <div>
          <ewt-button
            label="Configure"
            @click=${async () => {
              this._state = "CONFIGURE";
            }}
          ></ewt-button>
        </div>
        <div>
          <ewt-button
            label="Logs & Console"
            @click=${async () => {
              this._state = "LOGS";
            }}
          ></ewt-button>
        </div>
      </div>
    `;
  
    return [heading, content, hideActions, allowClosing];
  }

  private async _ensureSSIDsAreUpdated() {
    let attempts = 0;
    const maxAttempts = 2; // Set a maximum number of attempts to prevent infinite loops
    try {
      while (this.availableSSIDs.length === 0 && attempts < maxAttempts) {
          await this._populateDropdownWithSSIDs();
          attempts++;
          if (this.availableSSIDs.length > 0) {
              break; // Exit the loop if SSIDs are found
          }
      }
      if (attempts >= maxAttempts) {
          console.log("Maximum attempts reached without finding SSIDs.");
      }
    } catch (error) {
      console.error("Error updating SSIDs:", error);
    } finally {
      this.scanningSSIDs = false; // Ensure scanning flag is set to false at the end
    }
  }

  private _renderConfigure(): [string | undefined, TemplateResult, boolean] {
    this._fetchConfigs();
    let heading: string | undefined = `Configuration`;
    let content: TemplateResult;
    let hideActions = false;
  
    // Use this._currencies instead of fetching the currencies
    let currencies: string[] = this._currencies;

    // Initialize the "Existing Devices" selector to the "Select a configuration" state
    let configSelector = this.shadowRoot!.querySelector('select[name="existingConfigs"]') as HTMLSelectElement;
    if (configSelector) {
      let event = new Event('change');
      Object.defineProperty(event, 'target', { 
        writable: false, 
        value: configSelector 
      });
      this._handleConfigChange(event);
    } 
  
    content = html`
    <form id="configurationForm" style="display: grid; grid-template-columns: 1fr 20px 1fr;">
      <div style="grid-column: 1;">
        <label>Expert Mode:</label>
      </div>
      <div style="grid-column: 3;">
        <input type="checkbox" id="expertMode" name="expertMode" .checked=${this._expertMode} @change=${this._toggleExpertMode} />
      </div>
      ${this._expertMode ? html`
        <div style="grid-column: 1;">
          <label>API Key:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="apiKey.key" value="BueokH4o3FmhWmbvqyqLKz" />
        </div>
        <div style="grid-column: 1;">
          <label>Callback URL:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="callbackUrl" value="https://${domain}/lnurldevice/api/v1/lnurl/hTUMG" />
        </div>
        <div style="grid-column: 1;">
          <label>Fiat Precision:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="fiatPrecision" value="2" />
        </div>
        <div style="grid-column: 1;">
          <label>Battery Max Volts:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="batteryMaxVolts" value="4.2" />
        </div>
        <div style="grid-column: 1;">
          <label>Battery Min Volts:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="batteryMinVolts" value="3.3" />
        </div>
        <div style="grid-column: 1;">
          <label>Contrast Level:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="contrastLevel" value="75" />
        </div>
        <div style="grid-column: 1;">
          <label>Log Level:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="logLevel" value="info" />
        </div>
        <div style="grid-column: 1;">
          <label>Fiat Currency:</label>
        </div>
        <div style="grid-column: 3;">
          <select id="fiatCurrency" name="fiatCurrency">
            ${currencies.map(currency => html`<option value="${currency}" ${currency === 'EUR' ? 'selected' : ''}>${currency}</option>`)}
          </select>
        </div>
      ` : html`
        <div style="grid-column: 1;">
          <label>Select Device:</label>
        </div>
        <div style="grid-column: 3;">
          <select name="existingConfigs" @change=${this._handleConfigChange}>
            ${this._existingConfigs.map(config => html`
              <option value="${config.id}">${config.title}</option>
            `)}
            <option value="createNewDevice" selected>Create New Device</option>
          </select>
        </div>
        <div style="grid-column: 1;" id="titleLabel" style="display: none;">
          <label>Title:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="title" id="titleInput" style="display: none;" />
        </div>
        <div style="grid-column: 1;" id="currencyLabel" style="display: none;">
          <label>Fiat Currency:</label>
        </div>
        <div style="grid-column: 3;">
          <select id="fiatCurrency" name="fiatCurrency" style="display: none;">
            ${currencies.map(currency => html`<option value="${currency}" ${currency === 'EUR' ? 'selected' : ''}>${currency}</option>`)}
          </select>
        </div>
      `}
      <form id="configurationForm" style="display: grid; grid-template-columns: 1fr 20px 1fr;">
    <div style="grid-column: 1;">
      <label>WiFi SSID:</label>
    </div>
    <div style="grid-column: 3;">
      <select id="wifiSSID" name="wifiSSID" @click=${this._handleSSIDClick}>
        <option value="">--select SSID--</option>
        ${this.availableSSIDs.map(ssid => html`<option value="${ssid}">${ssid}</option>`)}
        <option value="manual">Enter Manually</option>
      </select>
      <input type="text" id="manualSSID" name="manualSSID" style="display:none;" placeholder="Enter SSID manually">
    </div>
    <div style="grid-column: 1;">
      <label>WiFi Password:</label>
    </div>
    <div style="grid-column: 3;">
      <input type="text" name="wifiPwd" value="" />
    </div>
    <div style="grid-column: 1;">
      <label>WiFi SSID2:</label>
    </div>
    <div style="grid-column: 3;">
      <select id="wifiSSID2" name="wifiSSID2" @click=${this._handleSSIDClick}>
        <option value="">--select SSID--</option>
        ${this.availableSSIDs.map(ssid => html`<option value="${ssid}">${ssid}</option>`)}
        <option value="manual">Enter Manually</option>
      </select>
      <input type="text" id="manualSSID2" name="manualSSID2" style="display:none;" placeholder="Enter SSID manually">
    </div>
    <div style="grid-column: 1;">
      <label>WiFi Password 2:</label>
    </div>
    <div style="grid-column: 3;">
        <input type="text" name="wifiPwd2" value="" />
    </div>
    </form>
    <ewt-button
      slot="primaryAction"
      label="Save Configuration"
      @click=${() => {
        if (this.scanningSSIDs) {
          alert('SSID scan in progress. Please wait a moment before saving the configurations.');
        } else {
          this._saveConfiguration();
        }
      }}
    ></ewt-button>
  `;
  
    return [heading, content, hideActions];
  }

  private async _scanSSIDs(): Promise<any> {
    const id = "1";
    const jsonRpcVersion = "2.0";
  
    const data = {
      "jsonrpc": jsonRpcVersion,
      "id": id,
      "method": "scanSSIDs",
      "params": {}
    };
  
    // Write the data to the serial port
    if (this.port && this.port.writable) {
      const writer = this.port.writable.getWriter();
      const encoder = new TextEncoder();
      const dataStr = JSON.stringify(data) + "\n";
      const encodedData = encoder.encode(dataStr);
      await writer.write(encodedData);
      writer.releaseLock();
    } else {
      throw new Error("Serial port is not open or writable");
    }
  
    // Read the response from the serial port
    if (this.port && this.port.readable) {
      const reader = this.port.readable.getReader();
      try {
        let completeData = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          const textDecoder = new TextDecoder();
          const chunk = textDecoder.decode(value, { stream: true });
          completeData += chunk;
  
          // Check if the complete data contains one or more complete JSON responses
          let jsonResponses = this.extractJsonResponses(completeData);
          if (jsonResponses.length > 0) {
            // Remove the parsed JSON responses from the complete data
            completeData = completeData.slice(completeData.lastIndexOf('}') + 1);
            
            // Find the response that is different from the sent data
            let response = jsonResponses.find(resp => JSON.stringify(resp) !== JSON.stringify(data));
            if (response) {
              console.log("Parsed JSON response:", response);
              reader.releaseLock(); // Release the reader lock before returning
              return response;
            }
          }
        }
        reader.releaseLock(); // Release the reader lock if no valid response is found
        throw new Error("No valid JSON response received from the serial port");
      } catch (error) {
        console.error('Error reading from serial port:', error);
        reader.releaseLock(); // Release the reader lock in case of an error
        throw error;
      }
    } else {
      throw new Error("Serial port is not open or readable");
    }
  }
  
  private extractJsonResponses(data: string): any[] {
    let jsonResponses = [];
    let startIndex = data.indexOf('{');
    while (startIndex !== -1) {
      let endIndex = data.indexOf('}', startIndex);
      if (endIndex !== -1) {
        let jsonString = data.substring(startIndex, endIndex + 1);
        try {
          let jsonObject = JSON.parse(jsonString);
          jsonResponses.push(jsonObject);
        } catch (error) {
          // Ignore parse errors and continue searching
        }
        startIndex = data.indexOf('{', endIndex);
      } else {
        break;
      }
    }
    return jsonResponses;
  }

  private _toggleExpertMode(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    this._expertMode = checkbox.checked;
    this.requestUpdate(); // This triggers a re-render
  }

  private async _saveConfiguration() {
    const form = this.shadowRoot?.querySelector('#configurationForm') as HTMLFormElement;
    if (!form) return;
  
    // Set scanningSSIDs to true after the form has been submitted
    this.scanningSSIDs = true;

    // Create a new FormData instance
    let formData = new FormData(form);
  
    // Convert formData to an object
    let object: any = {};
    formData.forEach((value, key) => { object[key] = value });

    // Check if manual SSID should be used
    if (object.wifiSSID === 'manual' && object.manualSSID) {
      object.wifiSSID = object.manualSSID;
    }

    if (object.wifiSSID2 === 'manual' && object.manualSSID2) {
      object.wifiSSID2 = object.manualSSID2;
    }

    delete object.expertMode;
    delete object.manualSSID;
    delete object.manualSSID2;
  
    // If expert mode is enabled, write the data to json exactly as entered by the user
    if (this._expertMode) {
      // No additional processing needed for expert mode
    } else {
      // Check if an existing configuration is selected
      if (object.existingConfigs !== 'createNewDevice') {
        // Find the selected configuration
        const selectedConfig = this._existingConfigs.find(config => config.id === object.existingConfigs);
  
        if (selectedConfig) {
          // Replace the "existingConfigs" field with the "apiKey", "callbackUrl", and "currency" fields from the selected configuration
          object['apiKey.key'] = selectedConfig.key;
          object['callbackUrl'] = `https://${domain}/lnurldevice/api/v1/lnurl/${selectedConfig.id}`;
          object['fiatCurrency'] = selectedConfig.currency;
          object['fiatPrecision'] = '2';
          object['batteryMaxVolts'] = '4.2';
          object['batteryMinVolts'] = '3.3';
          object['contrastLevel'] = '75';
          object['logLevel'] = 'info';
  
          // Remove the "existingConfigs" and "title" field
          delete object.existingConfigs;
          delete object.title;
        }
      }
  
      // Check if "Create New Device" is selected
      if (object.existingConfigs === 'createNewDevice') {
        // Here we should call _createNewDevice method and update the form data accordingly
        const newDevice = await this._createNewDevice();
        
        if (newDevice) {
          object['apiKey.key'] = newDevice.apiKey;
          object['callbackUrl'] = newDevice.callbackUrl;
          object['fiatPrecision'] = '2';
          object['batteryMaxVolts'] = '4.2';
          object['batteryMinVolts'] = '3.3';
          object['contrastLevel'] = '75';
          object['logLevel'] = 'info';
      
          // Remove the "existingConfigs" and "title" field
          delete object.existingConfigs;
          delete object.title;
        }
      }
  
      if (object['fiatCurrency'] === 'sat') {
        object['fiatPrecision'] = '0';
      }
    }
  
    // Prepare the data to be sent
    const data = {
      "jsonrpc": "2.0",
      "id": "1",
      "method": "setconfig",
      "params": object
    };
    // Check if the API key or callback url are blank
    if (!data.params['apiKey.key'] || !data.params['callbackUrl'] || data.params['apiKey.key'] === 'BueokH4o3FmhWmbvqyqLKz') {
      alert('Fetching API keys Failed: Please check your internet connection and try again. If the problem reappears, contact support@opago-pay.com');
      return;
    }
    
    // Check if the API key or callback url are for demo mode
    if (data.params['callbackUrl'] === 'https://opago-pay.com/getstarted') {
      if (!confirm('Are you sure you want to put the device in Demo Mode?')) {
        return;
      }
    }
    // Send the configuration to the ESP32 via JSON-RPC
    try {
      if (!this.port || this.port.readable === null || this.port.writable === null) {
        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: 115200 });
      }
  
      if (this.port.writable) {
        const writer = this.port.writable.getWriter();
        const encoder = new TextEncoder();
        const dataStr = JSON.stringify(data);
        console.log("Sending:", dataStr);  // log data before sending
        const encodedData = encoder.encode(dataStr + "\n"); // add newline character at the end
        await writer.write(encodedData);
        writer.releaseLock();
      } else {
        console.error('The port is not writable');
      } 
      this.scanningSSIDs = false; 
      // Output the progress to a console-style window
      this._state = "LOGS";
      this.logger.log(`Configuration saved successfully.`);
    } catch (e) {
      this.logger.error(`There was an error saving the configuration: ${(e as Error).message}`);
    }
  }

  _renderAskErase(): [string | undefined, TemplateResult] {
    const heading = "Erase device";
    const content = html`
      <div>
        Do you want to erase the device before installing
        ${this._manifest.name}? All data on the device will be lost.
      </div>
      <ewt-formfield label="Erase device" class="danger">
        <ewt-checkbox></ewt-checkbox>
      </ewt-formfield>
      <ewt-button
        slot="primaryAction"
        label="Next"
        @click=${() => {
          const checkbox = this.shadowRoot!.querySelector("ewt-checkbox")!;
          this._startInstall(checkbox.checked);
        }}
      ></ewt-button>
      <ewt-button
        slot="secondaryAction"
        label="Back"
        @click=${() => {
          this._state = "DASHBOARD";
        }}
      ></ewt-button>
    `;

    return [heading, content];
  }

  _renderInstall(): [string | undefined, TemplateResult, boolean, boolean] {
    let heading: string | undefined;
    let content: TemplateResult;
    let hideActions = false;
    const allowClosing = false;
  
    if (!this._installConfirmed) {
      heading = "Confirm Installation";
      content = html`
        Do you want to install ${this._manifest.name}&nbsp;${this._manifest.version}?
        ${this._installErase
          ? html`<br /><br />All data on the device will be erased.`
          : ""}
        <ewt-button
          slot="primaryAction"
          label="Install"
          @click=${this._confirmInstall}
        ></ewt-button>
        <ewt-button
          slot="secondaryAction"
          label="Back"
          @click=${() => {
            this._state = "DASHBOARD";
          }}
        ></ewt-button>
      `;
    } else if (
      !this._installState ||
      this._installState.state === FlashStateType.INITIALIZING ||
      this._installState.state === FlashStateType.PREPARING
    ) {
      heading = "Installing";
      content = this._renderProgress("Preparing installation");
      hideActions = true;
    } else if (this._installState.state === FlashStateType.ERASING) {
      heading = "Installing";
      content = this._renderProgress("Erasing");
      hideActions = true;
    } else if (this._installState.state === FlashStateType.WRITING) {
      heading = "Installing";
      let percentage: number | undefined;
      if (this._installState.details.percentage < 4) {
        content = this._renderProgress("Installing");
      } else {
        percentage = this._installState.details.percentage;
        content = this._renderProgress(
          html`
            Installing<br />
            This will take
            ${this._installState.chipFamily === "ESP8266"
              ? "a minute"
              : "2 minutes"}.<br />
            Keep this page visible to prevent slow down
          `,
          percentage,
        );
      }
      hideActions = true;
    } else if (this._installState.state === FlashStateType.FINISHED) {
      heading = undefined;
      content = html`
        <ewt-page-message
          .icon=${OK_ICON}
          label="Installation complete!"
        ></ewt-page-message>
        <ewt-button
          slot="primaryAction"
          label="Next"
          @click=${() => {
            this._state = "DASHBOARD";
          }}
        ></ewt-button>
      `;
    } else if (this._installState.state === FlashStateType.ERROR) {
      heading = "Installation failed";
      content = html`
        <ewt-page-message
          .icon=${ERROR_ICON}
          .label=${this._installState.message}
        ></ewt-page-message>
        <ewt-button
          slot="primaryAction"
          label="Back"
          @click=${async () => {
            this._initialize();
            this._state = "DASHBOARD";
          }}
        ></ewt-button>
      `;
    }
    return [heading, content!, hideActions, allowClosing];
  }

  _renderLogs(): [string | undefined, TemplateResult, boolean] {
    let heading: string | undefined = `Logs`;
    let content: TemplateResult;
    let hideActions = false;

    content = html`
      <ewt-console .port=${this.port} .logger=${this.logger}></ewt-console>
      <ewt-button
        slot="primaryAction"
        label="Back"
        @click=${async () => {
          await this.shadowRoot!.querySelector("ewt-console")!.disconnect();
          this._state = "DASHBOARD";
          this._initialize();
        }}
      ></ewt-button>
      <ewt-button
        slot="secondaryAction"
        label="Download Logs"
        @click=${() => {
          textDownload(
            this.shadowRoot!.querySelector("ewt-console")!.logs(),
            `esp-web-tools-logs.txt`,
          );

          this.shadowRoot!.querySelector("ewt-console")!.reset();
        }}
      ></ewt-button>
      <ewt-button
        slot="secondaryAction"
        label="Reset Device"
        @click=${async () => {
          await this.shadowRoot!.querySelector("ewt-console")!.reset();
        }}
      ></ewt-button>
    `;

    return [heading, content!, hideActions];
  }

  public override willUpdate(changedProps: PropertyValues) {
    if (!changedProps.has("_state")) {
      return;
    }
    // Clear errors when changing between pages unless we change
    // to the error page.
    if (this._state !== "ERROR") {
      this._error = undefined;
    }

    if (this._state === "INSTALL") {
      this._installConfirmed = false;
      this._installState = undefined;
    }
  }

  protected override firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._initialize();
  }

  protected override updated(changedProps: PropertyValues) {
    super.updated(changedProps);
  
    if (changedProps.has("_state")) {
      this.setAttribute("state", this._state);
  
      if (this._state === "CONFIGURE") {
        this._fetchCurrencies();
        this._ensureSSIDsAreUpdated();
        } 
    }
  }

  private async _initialize(justInstalled = false) {
    if (this.port.readable === null || this.port.writable === null) {
      this._state = "ERROR";
      this._error =
        "Serial port is not readable/writable. Close any other application using it and try again.";
      return;
    }

    try {
      this._manifest = await downloadManifest(this.manifestPath);
    } catch (err: any) {
      this._state = "ERROR";
      this._error = "Failed to download manifest";
      return;
    }
  }

  private _startInstall(erase: boolean) {
    this._state = "INSTALL";
    this._installErase = erase;
    this._installConfirmed = false;
  }

  private _confirmInstall() {
    this._installConfirmed = true;
    this._installState = undefined;
  
    // Close port. ESPLoader likes opening it.
    this.port.close().then(() => {
      flash(
        (state) => {
          this._installState = state;
  
          if (state.state === FlashStateType.FINISHED) {
            sleep(100)
              // Flashing closes the port
              .then(() => this.port.open({ baudRate: 115200 }))
              .then(() => this._initialize(true))
              .then(() => {
                this._state = "CONFIGURE"; // Change state to CONFIGURE after installation
                this.requestUpdate();
              });
          } else if (state.state === FlashStateType.ERROR) {
            sleep(100)
              // Flashing closes the port
              .then(() => this.port.open({ baudRate: 115200 }));
          }
        },
        this.port,
        this.manifestPath,
        this._manifest,
        this._installErase,
      );
    });
    // YOLO2
  }

  private async _handleClose() {
    fireEvent(this, "closed" as any);
    this.parentNode!.removeChild(this);
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        --mdc-dialog-max-width: 390px;
      }
      ewt-icon-button {
        position: absolute;
        right: 4px;
        top: 10px;
      }
      .table-row {
        display: flex;
      }
      .table-row.last {
        margin-bottom: 16px;
      }
      .table-row svg {
        width: 20px;
        margin-right: 8px;
      }
      ewt-textfield,
      ewt-select {
        display: block;
        margin-top: 16px;
      }
      .dashboard-buttons {
        margin: 0 0 -16px -8px;
      }
      .dashboard-buttons div {
        display: block;
        margin: 4px 0;
      }
      a.has-button {
        text-decoration: none;
      }
      .error {
        color: var(--improv-danger-color);
      }
      .danger {
        --mdc-theme-primary: var(--improv-danger-color);
        --mdc-theme-secondary: var(--improv-danger-color);
      }
      button.link {
        background: none;
        color: inherit;
        border: none;
        padding: 0;
        font: inherit;
        text-align: left;
        text-decoration: underline;
        cursor: pointer;
      }
      :host([state="LOGS"]) ewt-dialog {
        --mdc-dialog-max-width: 90vw;
      }
      ewt-console {
        width: calc(80vw - 48px);
        height: 80vh;
      }
      ewt-list-item[value="-1"] {
        border-top: 1px solid #ccc;
      }

      .dashboard-buttons ewt-button {
        width: 100%; /* Full width buttons */
      }
    `,
    ];
}

customElements.define("ewt-install-dialog", EwtInstallDialog);

declare global {
  interface HTMLElementTagNameMap {
    "ewt-install-dialog": EwtInstallDialog;
  }
}

