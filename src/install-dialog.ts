import { LitElement, html, PropertyValues, css, TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import "./components/ewt-button";
import "./components/ewt-checkbox";
import "./components/ewt-console";
import "./components/ewt-dialog";
import "./components/ewt-formfield";
import "./components/ewt-icon-button";
import "./components/ewt-textfield";
import type { EwtTextfield } from "./components/ewt-textfield";
import "./components/ewt-select";
import "./components/ewt-list-item";
import "./pages/ewt-page-progress";
import "./pages/ewt-page-message";
import {
  chipIcon,
  closeIcon,
  firmwareIcon,
  refreshIcon,
} from "./components/svg";
import { Logger, Manifest, FlashStateType, FlashState } from "./const.js";
import { ImprovSerial, Ssid } from "improv-wifi-serial-sdk/dist/serial";
import {
  ImprovSerialCurrentState,
  ImprovSerialErrorState,
  PortNotReady,
} from "improv-wifi-serial-sdk/dist/const";
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

export class EwtInstallDialog extends LitElement {
  public port!: SerialPort;

  public manifestPath!: string;

  public logger: Logger = console;

  private _expertMode: boolean = false;

  public overrides?: {
    checkSameFirmware?: (
      manifest: Manifest,
      deviceImprov: ImprovSerial["info"],
    ) => boolean;
  };

  private _manifest!: Manifest;

  private _info?: ImprovSerial["info"];

  // null = NOT_SUPPORTED
  @state() private _client?: ImprovSerial | null;

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

  @state() private _provisionForce = false;
  private _wasProvisioned = false;

  @state() private _error?: string;

  @state() private _busy = false;

  // undefined = not loaded
  // null = not available
  @state() private _ssids?: Ssid[] | null;

  // Name of Ssid. Null = other
  @state() private _selectedSsid: string | null = null;

  @state() private _currencies: string[] = [];

  @state() private _existingConfigs: any[] = [];

  // Hardcoded currencies with EUR, USD, CHF at the beginning and also in their alphabetical place
  private async _fetchCurrencies() {
    this._currencies = ["EUR", "USD", "CHF", "sat", "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTN","BWP","BYN","BYR","BZD","CAD","CDF","CHF","CLF","CLP","CNH","CNY","COP","CRC","CUC","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","GBP","GEL","GGP","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","INR","IQD","IRT","ISK","JEP","JMD","JOD","JPY","KES","KGS","KHR","KMF","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRO","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SEK","SGD","SHP","SLL","SOS","SRD","SSP","STD","SVC","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS","UAH","UGX","USD","UYU","UZS","VEF","VES","VND","VUV","WST","XAF","XAG","XAU","XCD","XDR","XOF","XPD","XPF","XPT","YER","ZAR","ZMW","ZWL"];
  }
  // Fetching currencies from server is currently disabled
  // private async _fetchCurrencies() {
  //   try {
  //     const response = await fetch('https://lnbits.opago-pay.com/api/v1/currencies', {
  //       method: 'GET',
  //       headers: {
  //         'Accept': 'application/json',
  //       },
  //     });
  // 
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  // 
  //     const fetchedCurrencies = await response.json();
  //     this._currencies = ['EUR', 'USD', 'CHF', ...fetchedCurrencies];
  //   } catch (e) {
  //     // If there is an error fetching the currencies, we still show EUR, USD and CHF
  //     this._currencies = ['EUR', 'USD', 'CHF'];
  //     if (e instanceof Error) {
  //       this.logger.error("There was an error fetching the currencies: ", e.message);
  //     } else {
  //       this.logger.error("There was an error fetching the currencies: ", e);
  //     }
  //   }
  // }

  private async _fetchConfigs() {
    const response = await fetch('https://lnbits.opago-pay.com/lnurldevice/api/v1/lnurlpos?api-key=58e1397eefb54ace8d42532d7e520cb8', {
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
      "wallet": "ed8acf51b42a4212b00906681ebd194b",
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
  
    const response = await fetch('https://lnbits.opago-pay.com/lnurldevice/api/v1/lnurlpos?api-key=529201a89fce404585afcb884e91a505', {
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
    callbackUrl: `https://lnbits.opago-pay.com/lnurldevice/api/v1/lnurl/${newDevice.id}`, // replace 'id' with the actual property name for the ID in the newDevice object
  };
}


  protected render() {
    if (!this.port) {
      return html``;
    }
    let heading: string | undefined;
    let content: TemplateResult;
    let hideActions = false;
    let allowClosing = false;

    // During installation phase we temporarily remove the client
    if (
      this._client === undefined &&
      this._state !== "INSTALL" &&
      this._state !== "LOGS"
    ) {
      if (this._error) {
        [heading, content, hideActions] = this._renderError(this._error);
      } else {
        content = this._renderProgress("Connecting");
        hideActions = true;
      }
    } else if (this._state === "INSTALL") {
      [heading, content, hideActions, allowClosing] = this._renderInstall();
    } else if (this._state === "ASK_ERASE") {
      [heading, content] = this._renderAskErase();
    } else if (this._state === "ERROR") {
      [heading, content, hideActions] = this._renderError(this._error!);
    } else if (this._state === "DASHBOARD") {
      [heading, content, hideActions, allowClosing] = this._client
        ? this._renderDashboard()
        : this._renderDashboardNoImprov();
    } else if (this._state === "PROVISION") {
      [heading, content, hideActions] = this._renderProvision();
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
    const heading = this._info!.name;
    let content: TemplateResult;
    let hideActions = true;
    let allowClosing = true;

    content = html`
      <div class="table-row">
        ${firmwareIcon}
        <div>${this._info!.firmware}&nbsp;${this._info!.version}</div>
      </div>
      <div class="table-row last">
        ${chipIcon}
        <div>${this._info!.chipFamily}</div>
      </div>
      <div class="dashboard-buttons">
        ${!this._isSameVersion
          ? html`
              <div>
                <ewt-button
                  text-left
                  .label=${!this._isSameFirmware
                    ? `Install ${this._manifest.name}`
                    : `Update ${this._manifest.name}`}
                  @click=${() => {
                    if (this._isSameFirmware) {
                      this._startInstall(false);
                    } else if (this._manifest.new_install_prompt_erase) {
                      this._state = "ASK_ERASE";
                    } else {
                      this._startInstall(true);
                    }
                  }}
                ></ewt-button>
              </div>
            `
          : ""}
        <div>
          <ewt-button
          label="Configure"
          @click=${async () => {
            this._state = "CONFIGURE";
          }}
          ></ewt-button>
        </div>
        ${this._client!.nextUrl === undefined
          ? ""
          : html`
              <div>
                <a
                  href=${this._client!.nextUrl}
                  class="has-button"
                  target="_blank"
                >
                  <ewt-button label="Visit Device"></ewt-button>
                </a>
              </div>
            `}
        ${!this._manifest.home_assistant_domain ||
        this._client!.state !== ImprovSerialCurrentState.PROVISIONED
          ? ""
          : html`
              <div>
                <a
                  href=${`https://my.home-assistant.io/redirect/config_flow_start/?domain=${this._manifest.home_assistant_domain}`}
                  class="has-button"
                  target="_blank"
                >
                  <ewt-button label="Add to Home Assistant"></ewt-button>
                </a>
              </div>
            `}
        <div>
          <ewt-button
            .label=${this._client!.state === ImprovSerialCurrentState.READY
              ? "Connect to Wi-Fi"
              : "Change Wi-Fi"}
            @click=${() => {
              this._state = "PROVISION";
              if (
                this._client!.state === ImprovSerialCurrentState.PROVISIONED
              ) {
                this._provisionForce = true;
              }
            }}
          ></ewt-button>
        </div>
        <div>
          <ewt-button
            label="Logs & Console"
            @click=${async () => {
              const client = this._client;
              if (client) {
                await this._closeClientWithoutEvents(client);
                await sleep(100);
              }
              // Also set `null` back to undefined.
              this._client = undefined;
              this._state = "LOGS";
            }}
          ></ewt-button>
        </div>
        ${this._isSameFirmware && this._manifest.funding_url
          ? html`
              <div>
                <a
                  class="button"
                  href=${this._manifest.funding_url}
                  target="_blank"
                >
                  <ewt-button label="Fund Development"></ewt-button>
                </a>
              </div>
            `
          : ""}
        ${this._isSameVersion
          ? html`
              <div>
                <ewt-button
                  class="danger"
                  label="Erase User Data"
                  @click=${() => this._startInstall(true)}
                ></ewt-button>
              </div>
            `
          : ""}
      </div>
    `;

    return [heading, content, hideActions, allowClosing];
  }
  _renderDashboardNoImprov(): [string, TemplateResult, boolean, boolean] {
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
                // Default is to erase a device that does not support Improv Serial
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
              // Also set `null` back to undefined.
              this._client = undefined;
              this._state = "LOGS";
            }}
          ></ewt-button>
        </div>
      </div>
    `;
  
    return [heading, content, hideActions, allowClosing];
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
        <input type="checkbox" id="expertMode" name="expertMode" @change=${this._toggleExpertMode} />
      </div>
      ${this._expertMode ? html`
        <div style="grid-column: 1;">
          <label>API Key:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="apiKey.key" value="BueokH4o3FmhWmbvqyqLKz" />
        </div>
        <div style="grid-column: 1;">
          <label>API Key Encoding:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="apiKey.encoding" value="" />
        </div>
        <div style="grid-column: 1;">
          <label>Callback URL:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="callbackUrl" value="https://lnbits.opago-pay.com/lnurldevice/api/v1/lnurl/hTUMG" />
        </div>
        <div style="grid-column: 1;">
          <label>URI Schema Prefix:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="uriSchemaPrefix" value="" />
        </div>
        <div style="grid-column: 1;">
          <label>Fiat Precision:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="fiatPrecision" value="2" />
        </div>
        <div style="grid-column: 1;">
          <label>Locale:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="locale" value="en" />
        </div>
        <div style="grid-column: 1;">
          <label>TFT Rotation:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="tftRotation" value="3" />
        </div>
        <div style="grid-column: 1;">
          <label>Sleep Mode Delay:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="sleepModeDelay" value="600000" />
        </div>
        <div style="grid-column: 1;">
          <label>Battery Max Volts:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="batteryMaxVolts" value="3.7" />
        </div>
        <div style="grid-column: 1;">
          <label>Battery Min Volts:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="batteryMinVolts" value="2.1" />
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
          <label>SPIFFS Formatted:</label>
        </div>
        <div style="grid-column: 3;">
          <input type="text" name="spiffsFormatted" value="false" />
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
          <label>Existing Devices:</label>
        </div>
        <div style="grid-column: 3;">
          <select name="existingConfigs" @change=${this._handleConfigChange}>
            <option value="">Select a configuration</option>
            ${this._existingConfigs.map(config => html`
              <option value="${config.id}">${config.title}</option>
            `)}
            <option value="createNewDevice">Create New Device</option>
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
        <input type="hidden" name="apiKey.encoding" value="" />
        <input type="hidden" name="uriSchemaPrefix" value="" />
      `}
      <div style="grid-column: 1;">
        <label>WiFi SSID:</label>
      </div>
      <div style="grid-column: 3;">
        <input type="text" name="wifiSSID" value="" />
      </div>
      <div style="grid-column: 1;">
        <label>WiFi Password:</label>
      </div>
      <div style="grid-column: 3;">
        <input type="text" name="wifiPwd" value="" />
      </div>
      <input type="hidden" name="fiatPrecision" value="2" />
      <input type="hidden" name="locale" value="en" />
      <input type="hidden" name="tftRotation" value="3" />
      <input type="hidden" name="sleepModeDelay" value="600000" />
      <input type="hidden" name="batteryMaxVolts" value="3.7" />
      <input type="hidden" name="batteryMinVolts" value="2.1" />
      <input type="hidden" name="contrastLevel" value="75" />
      <input type="hidden" name="logLevel" value="info" />
      <input type="hidden" name="spiffsFormatted" value="false" />
    </form>
    <ewt-button
      slot="primaryAction"
      label="Save Configuration"
      @click=${this._saveConfiguration}
    ></ewt-button>
  `;
  
    return [heading, content, hideActions];
  }

  private _toggleExpertMode() {
    this._expertMode = !this._expertMode;
    this.requestUpdate(); // This is needed to re-render the component
  }

  private async _saveConfiguration() {
    const form = this.shadowRoot?.querySelector('#configurationForm');
    if (!form) return;
    const formData = new FormData(form as HTMLFormElement);
  
    // Convert formData to an object
    let object: any = {};
    formData.forEach((value, key) => { object[key] = value });
  
    // Check if an existing configuration is selected
    if (object.existingConfigs !== 'createNewDevice') {
      // Find the selected configuration
      const selectedConfig = this._existingConfigs.find(config => config.id === object.existingConfigs);

      if (selectedConfig) {
        // Replace the "existingConfigs" field with the "apiKey", "callbackUrl", and "currency" fields from the selected configuration
        object['apiKey.key'] = selectedConfig.key;
        object['callbackUrl'] = `https://lnbits.opago-pay.com/lnurldevice/api/v1/lnurl/${selectedConfig.id}`;
        object['fiatCurrency'] = selectedConfig.currency;

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
      
        // Remove the "existingConfigs" and "title" field
        delete object.existingConfigs;
        delete object.title;
      }
    }

    if (object['fiatCurrency'] === 'sat') {
      object['fiatPrecision'] = '0';
    }
  
    // Prepare the data to be sent
    const data = {
      "jsonrpc": "2.0",
      "id": "1",
      "method": "setconfig",
      "params": object
    };
  
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
  
      // Output the progress to a console-style window
      this._state = "LOGS";
      this.logger.log(`Configuration saved successfully.`);
    } catch (e) {
      this.logger.error(`There was an error saving the configuration: ${(e as Error).message}`);
    }
  }

  _renderProvision(): [string | undefined, TemplateResult, boolean] {
    let heading: string | undefined = "Configure Wi-Fi";
    let content: TemplateResult;
    let hideActions = false;

    if (this._busy) {
      return [
        heading,
        this._renderProgress(
          this._ssids === undefined
            ? "Scanning for networks"
            : "Trying to connect",
        ),
        true,
      ];
    }

    if (
      !this._provisionForce &&
      this._client!.state === ImprovSerialCurrentState.PROVISIONED
    ) {
      heading = undefined;
      const showSetupLinks =
        !this._wasProvisioned &&
        (this._client!.nextUrl !== undefined ||
          "home_assistant_domain" in this._manifest);
      hideActions = showSetupLinks;
      content = html`
        <ewt-page-message
          .icon=${OK_ICON}
          label="Device connected to the network!"
        ></ewt-page-message>
        ${showSetupLinks
          ? html`
              <div class="dashboard-buttons">
                ${this._client!.nextUrl === undefined
                  ? ""
                  : html`
                      <div>
                        <a
                          href=${this._client!.nextUrl}
                          class="has-button"
                          target="_blank"
                          @click=${() => {
                            this._state = "DASHBOARD";
                          }}
                        >
                          <ewt-button label="Visit Device"></ewt-button>
                        </a>
                      </div>
                    `}
                ${!this._manifest.home_assistant_domain
                  ? ""
                  : html`
                      <div>
                        <a
                          href=${`https://my.home-assistant.io/redirect/config_flow_start/?domain=${this._manifest.home_assistant_domain}`}
                          class="has-button"
                          target="_blank"
                          @click=${() => {
                            this._state = "DASHBOARD";
                          }}
                        >
                          <ewt-button
                            label="Add to Home Assistant"
                          ></ewt-button>
                        </a>
                      </div>
                    `}
                <div>
                  <ewt-button
                    label="Skip"
                    @click=${() => {
                      this._state = "DASHBOARD";
                    }}
                  ></ewt-button>
                </div>
              </div>
            `
          : html`
              <ewt-button
                slot="primaryAction"
                label="Continue"
                @click=${() => {
                  this._state = "DASHBOARD";
                }}
              ></ewt-button>
            `}
      `;
    } else {
      let error: string | undefined;

      switch (this._client!.error) {
        case ImprovSerialErrorState.UNABLE_TO_CONNECT:
          error = "Unable to connect";
          break;

        case ImprovSerialErrorState.TIMEOUT:
          error = "Timeout";
          break;

        case ImprovSerialErrorState.NO_ERROR:
        // Happens when list SSIDs not supported.
        case ImprovSerialErrorState.UNKNOWN_RPC_COMMAND:
          break;

        default:
          error = `Unknown error (${this._client!.error})`;
      }
      const selectedSsid = this._ssids?.find(
        (info) => info.name === this._selectedSsid,
      );
      content = html`
        <div>
          Enter the credentials of the Wi-Fi network that you want your device
          to connect to.
        </div>
        ${error ? html`<p class="error">${error}</p>` : ""}
        ${this._ssids !== null
          ? html`
              <ewt-select
                fixedMenuPosition
                label="Network"
                @selected=${(ev: { detail: { index: number } }) => {
                  const index = ev.detail.index;
                  // The "Join Other" item is always the last item.
                  this._selectedSsid =
                    index === this._ssids!.length
                      ? null
                      : this._ssids![index].name;
                }}
                @closed=${(ev: Event) => ev.stopPropagation()}
              >
                ${this._ssids!.map(
                  (info) => html`
                    <ewt-list-item
                      .selected=${selectedSsid === info}
                      .value=${info.name}
                    >
                      ${info.name}
                    </ewt-list-item>
                  `,
                )}
                <ewt-list-item .selected=${!selectedSsid} value="-1">
                  Join other…
                </ewt-list-item>
              </ewt-select>
              <ewt-icon-button @click=${this._updateSsids}>
                ${refreshIcon}
              </ewt-icon-button>
            `
          : ""}
        ${
          // Show input box if command not supported or "Join Other" selected
          !selectedSsid
            ? html`
                <ewt-textfield label="Network Name" name="ssid"></ewt-textfield>
              `
            : ""
        }
        ${!selectedSsid || selectedSsid.secured
          ? html`
              <ewt-textfield
                label="Password"
                name="password"
                type="password"
              ></ewt-textfield>
            `
          : ""}
        <ewt-button
          slot="primaryAction"
          label="Connect"
          @click=${this._doProvision}
        ></ewt-button>
        <ewt-button
          slot="secondaryAction"
          .label=${this._installState && this._installErase ? "Skip" : "Back"}
          @click=${() => {
            this._state = "DASHBOARD";
          }}
        ></ewt-button>
      `;
    }
    return [heading, content, hideActions];
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

    const isUpdate = !this._installErase && this._isSameFirmware;

    if (!this._installConfirmed && this._isSameVersion) {
      heading = "Erase User Data";
      content = html`
        Do you want to reset your device and erase all user data from your
        device?
        <ewt-button
          class="danger"
          slot="primaryAction"
          label="Erase User Data"
          @click=${this._confirmInstall}
        ></ewt-button>
      `;
    } else if (!this._installConfirmed) {
      heading = "Confirm Installation";
      const action = isUpdate ? "update to" : "install";
      content = html`
        ${isUpdate
          ? html`Your device is running
              ${this._info!.firmware}&nbsp;${this._info!.version}.<br /><br />`
          : ""}
        Do you want to ${action}
        ${this._manifest.name}&nbsp;${this._manifest.version}?
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
    } else if (
      this._installState.state === FlashStateType.WRITING ||
      // When we're finished, keep showing this screen with 100% written
      // until Improv is initialized / not detected.
      (this._installState.state === FlashStateType.FINISHED &&
        this._client === undefined)
    ) {
      heading = "Installing";
      let percentage: number | undefined;
      let undeterminateLabel: string | undefined;
      if (this._installState.state === FlashStateType.FINISHED) {
        // We're done writing and detecting improv, show spinner
        undeterminateLabel = "Wrapping up";
      } else if (this._installState.details.percentage < 4) {
        // We're writing the firmware under 4%, show spinner or else we don't show any pixels
        undeterminateLabel = "Installing";
      } else {
        // We're writing the firmware over 4%, show progress bar
        percentage = this._installState.details.percentage;
      }
      content = this._renderProgress(
        html`
          ${undeterminateLabel ? html`${undeterminateLabel}<br />` : ""}
          <br />
          This will take
          ${this._installState.chipFamily === "ESP8266"
            ? "a minute"
            : "2 minutes"}.<br />
          Keep this page visible to prevent slow down
        `,
        percentage,
      );
      hideActions = true;
    } else if (this._installState.state === FlashStateType.FINISHED) {
      heading = undefined;
      const supportsImprov = this._client !== null;
      content = html`
        <ewt-page-message
          .icon=${OK_ICON}
          label="Installation complete!"
        ></ewt-page-message>
        <ewt-button
          slot="primaryAction"
          label="Next"
          @click=${() => {
            this._state =
              supportsImprov && this._installErase ? "PROVISION" : "DASHBOARD";
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
    // Scan for SSIDs on provision
    if (this._state === "PROVISION") {
      this._updateSsids();
    } else {
      // Reset this value if we leave provisioning.
      this._provisionForce = false;
    }

    if (this._state === "INSTALL") {
      this._installConfirmed = false;
      this._installState = undefined;
    }
  }

  private async _updateSsids(tries = 0) {
    const oldSsids = this._ssids;
    this._ssids = undefined;
    this._busy = true;

    let ssids: Ssid[];

    try {
      ssids = await this._client!.scan();
    } catch (err) {
      // When we fail while loading, pick "Join other"
      if (this._ssids === undefined) {
        this._ssids = null;
        this._selectedSsid = null;
      }
      this._busy = false;
      return;
    }

    // We will retry a few times if we don't get any results
    if (ssids.length === 0 && tries < 3) {
      console.log("SCHEDULE RETRY", tries);
      setTimeout(() => this._updateSsids(tries + 1), 1000);
      return;
    }

    if (oldSsids) {
      // If we had a previous list, ensure the selection is still valid
      if (
        this._selectedSsid &&
        !ssids.find((s) => s.name === this._selectedSsid)
      ) {
        this._selectedSsid = ssids[0].name;
      }
    } else {
      this._selectedSsid = ssids.length ? ssids[0].name : null;
    }

    this._ssids = ssids;
    this._busy = false;
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
      } else if (this._state === "PROVISION") {
        if (changedProps.has("_selectedSsid") && this._selectedSsid === null) {
          // If we pick "Join other", select SSID input.
          this._focusFormElement("ewt-textfield[name=ssid]");
        } else if (changedProps.has("_ssids")) {
          // Form is shown when SSIDs are loaded/marked not supported
          this._focusFormElement();
        }
      }
    }
  }

  private _focusFormElement(selector = "ewt-textfield, ewt-select") {
    const formEl = this.shadowRoot!.querySelector(
      selector,
    ) as LitElement | null;
    if (formEl) {
      formEl.updateComplete.then(() => setTimeout(() => formEl.focus(), 100));
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

    if (this._manifest.new_install_improv_wait_time === 0) {
      this._client = null;
      return;
    }

    const client = new ImprovSerial(this.port!, this.logger);
    client.addEventListener("state-changed", () => {
      this.requestUpdate();
    });
    client.addEventListener("error-changed", () => this.requestUpdate());
    try {
      // If a device was just installed, give new firmware 10 seconds (overridable) to
      // format the rest of the flash and do other stuff.
      const timeout = !justInstalled
        ? 1000
        : this._manifest.new_install_improv_wait_time !== undefined
          ? this._manifest.new_install_improv_wait_time * 1000
          : 10000;
      this._info = await client.initialize(timeout);
      this._client = client;
      client.addEventListener("disconnect", this._handleDisconnect);
    } catch (err: any) {
      // Clear old value
      this._info = undefined;
      if (err instanceof PortNotReady) {
        this._state = "ERROR";
        this._error =
          "Serial port is not ready. Close any other application using it and try again.";
      } else {
        this._client = null; // not supported
        this.logger.error("Improv initialization failed.", err);
      }
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
    if (this._client) {
      this._closeClientWithoutEvents(this._client);
    }
    this._client = undefined;
  
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

  private async _doProvision() {
    this._busy = true;
    this._wasProvisioned =
      this._client!.state === ImprovSerialCurrentState.PROVISIONED;
    const ssid =
      this._selectedSsid === null
        ? (
            this.shadowRoot!.querySelector(
              "ewt-textfield[name=ssid]",
            ) as EwtTextfield
          ).value
        : this._selectedSsid;
    const password =
      (
        this.shadowRoot!.querySelector(
          "ewt-textfield[name=password]",
        ) as EwtTextfield | null
      )?.value || "";
    try {
      await this._client!.provision(ssid, password, 30000);
    } catch (err: any) {
      return;
    } finally {
      this._busy = false;
      this._provisionForce = false;
    }
  }

  private _handleDisconnect = () => {
    this._state = "ERROR";
    this._error = "Disconnected";
  };

  private async _handleClose() {
    if (this._client) {
      await this._closeClientWithoutEvents(this._client);
    }
    fireEvent(this, "closed" as any);
    this.parentNode!.removeChild(this);
  }

  /**
   * Return if the device runs same firmware as manifest.
   */
  private get _isSameFirmware() {
    return !this._info
      ? false
      : this.overrides?.checkSameFirmware
        ? this.overrides.checkSameFirmware(this._manifest, this._info)
        : this._info.firmware === this._manifest.name;
  }

  /**
   * Return if the device runs same firmware and version as manifest.
   */
  private get _isSameVersion() {
    return (
      this._isSameFirmware && this._info!.version === this._manifest.version
    );
  }

  private async _closeClientWithoutEvents(client: ImprovSerial) {
    client.removeEventListener("disconnect", this._handleDisconnect);
    await client.close();
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
    `,
  ];
}

customElements.define("ewt-install-dialog", EwtInstallDialog);

declare global {
  interface HTMLElementTagNameMap {
    "ewt-install-dialog": EwtInstallDialog;
  }
}
