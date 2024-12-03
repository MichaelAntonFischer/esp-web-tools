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
const language = document.body.dataset.language || 'en';

const translations = {
  en: {
    loading: "Loading...",
    loadingManifest: "Loading manifest...",
    deviceDashboard: "Device Dashboard",
    expertMode: "Expert Mode",
    selectDevice: "Select Device",
    createNewDevice: "Create New Device",
    title: "Title",
    fiatCurrency: "Fiat Currency",
    wifiSSID: "WiFi SSID",
    selectSSID: "--select SSID--",
    enterManually: "Enter Manually",
    enterSSIDManually: "Enter SSID manually",
    wifiPassword: "WiFi Password",
    saveConfiguration: "Save Configuration",
    eraseDevice: "Erase device",
    eraseWarning: "Do you want to erase the device before installing",
    allDataLost: "All data on the device will be lost.",
    next: "Next",
    back: "Back",
    confirmInstallation: "Confirm Installation",
    doYouWantToInstall: "Do you want to install",
    install: "Install",
    installing: "Installing",
    preparingInstallation: "Preparing installation",
    erasing: "Erasing",
    thisWillTake: "This will take",
    aMinute: "a minute",
    twoMinutes: "2 minutes",
    keepVisible: "Keep this page visible to prevent slow down",
    installationComplete: "Installation complete!",
    installationFailed: "Installation failed",
    logs: "Logs",
    downloadLogs: "Download Logs",
    resetDevice: "Reset Device",
    close: "Close",
    success: "Success",
    configSaved: "Configuration saved successfully!",
    expertModeWarning: "Warning: Expert mode is only for advanced users connecting to non-Opago LNBITS instances. Incorrect settings may cause the device to malfunction. Are you sure you want to continue?",
    demoModeConfirm: "Are you sure you want to put the device in Demo Mode?",
    connectionError: "Serial port is not readable/writable. Close any other application using it and try again.",
    manifestError: "Failed to download manifest",
    error: "Error",
    configure: "Configure",
    logsAndConsole: "Logs & Console",
    installDevice: "Install",
    downloadLogsButton: "Download Logs",
    resetDeviceButton: "Reset Device",
    confirmEraseTitle: "Erase device",
    confirmEraseMessage: "Do you want to erase the device before installing",
    confirmEraseWarning: "All data on the device will be lost.",
    apiKey: "API Key",
    callbackUrl: "Callback URL",
    fiatPrecision: "Fiat Precision",
    batteryMaxVolts: "Battery Max Volts",
    batteryMinVolts: "Battery Min Volts",
    contrastLevel: "Contrast Level",
    logLevel: "Log Level"
  },
  de: {
    loading: "Lädt...",
    loadingManifest: "Lade Manifest...",
    deviceDashboard: "Geräte-Dashboard",
    expertMode: "Expertenmodus",
    selectDevice: "Gerät auswählen",
    createNewDevice: "Neues Gerät erstellen",
    title: "Titel",
    fiatCurrency: "Fiat-Währung",
    wifiSSID: "WLAN-SSID",
    selectSSID: "--SSID auswählen--",
    enterManually: "Manuell eingeben",
    enterSSIDManually: "SSID manuell eingeben",
    wifiPassword: "WLAN-Passwort",
    saveConfiguration: "Konfiguration speichern",
    eraseDevice: "Gerät löschen",
    eraseWarning: "Möchten Sie das Gerät vor der Installation löschen",
    allDataLost: "Alle Daten auf dem Gerät gehen verloren.",
    next: "Weiter",
    back: "Zurück",
    confirmInstallation: "Installation bestätigen",
    doYouWantToInstall: "Möchten Sie installieren",
    install: "Installieren",
    installing: "Installiere",
    preparingInstallation: "Bereite Installation vor",
    erasing: "Lösche",
    thisWillTake: "Dies wird",
    aMinute: "eine Minute",
    twoMinutes: "2 Minuten",
    keepVisible: "Lassen Sie diese Seite sichtbar, um Verlangsamungen zu vermeiden",
    installationComplete: "Installation abgeschlossen!",
    installationFailed: "Installation fehlgeschlagen",
    logs: "Protokolle",
    downloadLogs: "Protokolle herunterladen",
    resetDevice: "Gerät zurücksetzen",
    close: "Schließen",
    success: "Erfolg",
    configSaved: "Konfiguration erfolgreich gespeichert!",
    expertModeWarning: "Warnung: Der Expertenmodus ist nur für fortgeschrittene Benutzer gedacht, die sich mit nicht-Opago LNBITS-Instanzen verbinden. Falsche Einstellungen können zu Fehlfunktionen des Geräts führen. Möchten Sie fortfahren?",
    demoModeConfirm: "Sind Sie sicher, dass Sie das Gerät in den Demo-Modus versetzen möchten?",
    connectionError: "Serieller Port ist nicht lesbar/beschreibbar. Schließen Sie alle anderen Anwendungen, die ihn verwenden, und versuchen Sie es erneut.",
    manifestError: "Manifest konnte nicht heruntergeladen werden",
    error: "Fehler",
    configure: "Konfigurieren",
    logsAndConsole: "Logs & Konsole",
    installDevice: "Installieren",
    downloadLogsButton: "Logs herunterladen",
    resetDeviceButton: "Gerät zurücksetzen",
    confirmEraseTitle: "Gerät löschen",
    confirmEraseMessage: "Möchten Sie das Gerät vor der Installation löschen",
    confirmEraseWarning: "Alle Daten auf dem Gerät gehen verloren.",
    apiKey: "API-Schlüssel",
    callbackUrl: "Callback-URL",
    fiatPrecision: "Fiat-Präzision",
    batteryMaxVolts: "Batterie Max Volt",
    batteryMinVolts: "Batterie Min Volt",
    contrastLevel: "Kontraststufe",
    logLevel: "Log-Level"
  },
  fr: {
    loading: "Chargement...",
    loadingManifest: "Chargement du manifeste...",
    deviceDashboard: "Tableau de bord",
    expertMode: "Mode expert",
    selectDevice: "Sélectionner l'appareil",
    createNewDevice: "Créer un nouvel appareil",
    title: "Titre",
    fiatCurrency: "Devise fiat",
    wifiSSID: "SSID WiFi",
    selectSSID: "--sélectionner SSID--",
    enterManually: "Saisir manuellement",
    enterSSIDManually: "Saisir le SSID manuellement",
    wifiPassword: "Mot de passe WiFi",
    saveConfiguration: "Enregistrer la configuration",
    eraseDevice: "Effacer l'appareil",
    eraseWarning: "Voulez-vous effacer l'appareil avant l'installation",
    allDataLost: "Toutes les données de l'appareil seront perdues.",
    next: "Suivant",
    back: "Retour",
    confirmInstallation: "Confirmer l'installation",
    doYouWantToInstall: "Voulez-vous installer",
    install: "Installer",
    installing: "Installation",
    preparingInstallation: "Préparation de l'installation",
    erasing: "Effacement",
    thisWillTake: "Cela prendra",
    aMinute: "une minute",
    twoMinutes: "2 minutes",
    keepVisible: "Gardez cette page visible pour éviter le ralentissement",
    installationComplete: "Installation terminée !",
    installationFailed: "Installation échouée",
    logs: "Journaux",
    downloadLogs: "Télécharger les journaux",
    resetDevice: "Réinitialiser l'appareil",
    close: "Fermer",
    success: "Succès",
    configSaved: "Configuration enregistrée avec succès !",
    expertModeWarning: "Attention : Le mode expert est réservé aux utilisateurs avancés se connectant à des instances LNBITS non-Opago. Des paramètres incorrects peuvent entraîner un dysfonctionnement de l'appareil. Voulez-vous continuer ?",
    demoModeConfirm: "Êtes-vous sûr de vouloir mettre l'appareil en mode démo ?",
    connectionError: "Le port série n'est pas lisible/inscriptible. Fermez toute autre application l'utilisant et réessayez.",
    manifestError: "Échec du téléchargement du manifeste",
    error: "Erreur",
    configure: "Configurer",
    logsAndConsole: "Journaux & Console",
    installDevice: "Installer",
    downloadLogsButton: "Télécharger les journaux",
    resetDeviceButton: "Réinitialiser l'appareil",
    confirmEraseTitle: "Effacer l'appareil",
    confirmEraseMessage: "Voulez-vous effacer l'appareil avant l'installation",
    confirmEraseWarning: "Toutes les données de l'appareil seront perdues.",
    apiKey: "Clé API",
    callbackUrl: "URL de callback",
    fiatPrecision: "Précision Fiat",
    batteryMaxVolts: "Tension max batterie",
    batteryMinVolts: "Tension min batterie",
    contrastLevel: "Niveau de contraste",
    logLevel: "Niveau de log"
  },
  es: {
    loading: "Cargando...",
    loadingManifest: "Cargando manifiesto...",
    deviceDashboard: "Panel del dispositivo",
    expertMode: "Modo experto",
    selectDevice: "Seleccionar dispositivo",
    createNewDevice: "Crear nuevo dispositivo",
    title: "Título",
    fiatCurrency: "Moneda fiat",
    wifiSSID: "SSID WiFi",
    selectSSID: "--seleccionar SSID--",
    enterManually: "Introducir manualmente",
    enterSSIDManually: "Introducir SSID manualmente",
    wifiPassword: "Contraseña WiFi",
    saveConfiguration: "Guardar configuración",
    eraseDevice: "Borrar dispositivo",
    eraseWarning: "¿Desea borrar el dispositivo antes de instalar",
    allDataLost: "Se perderán todos los datos del dispositivo.",
    next: "Siguiente",
    back: "Atrás",
    confirmInstallation: "Confirmar instalación",
    doYouWantToInstall: "¿Desea instalar",
    install: "Instalar",
    installing: "Instalando",
    preparingInstallation: "Preparando instalación",
    erasing: "Borrando",
    thisWillTake: "Esto tardará",
    aMinute: "un minuto",
    twoMinutes: "2 minutos",
    keepVisible: "Mantenga esta página visible para evitar ralentizaciones",
    installationComplete: "¡Instalación completada!",
    installationFailed: "Instalación fallida",
    logs: "Registros",
    downloadLogs: "Descargar registros",
    resetDevice: "Reiniciar dispositivo",
    close: "Cerrar",
    success: "Éxito",
    configSaved: "¡Configuración guardada con éxito!",
    expertModeWarning: "Advertencia: El modo experto es solo para usuarios avanzados que se conectan a instancias LNBITS no Opago. La configuración incorrecta puede causar mal funcionamiento del dispositivo. ¿Desea continuar?",
    demoModeConfirm: "¿Está seguro de que desea poner el dispositivo en modo demo?",
    connectionError: "El puerto serie no es legible/escribible. Cierre cualquier otra aplicación que lo esté usando e inténtelo de nuevo.",
    manifestError: "Error al descargar el manifiesto",
    error: "Error",
    configure: "Configurar",
    logsAndConsole: "Registros y Consola",
    installDevice: "Instalar",
    downloadLogsButton: "Descargar registros",
    resetDeviceButton: "Reiniciar dispositivo",
    confirmEraseTitle: "Borrar dispositivo",
    confirmEraseMessage: "¿Desea borrar el dispositivo antes de instalar",
    confirmEraseWarning: "Se perderán todos los datos del dispositivo.",
    apiKey: "Clave API",
    callbackUrl: "URL de callback",
    fiatPrecision: "Precisión Fiat",
    batteryMaxVolts: "Voltaje máx. batería",
    batteryMinVolts: "Voltaje mín. batería",
    contrastLevel: "Nivel de contraste",
    logLevel: "Nivel de registro"
  },
  it: {
    loading: "Caricamento...",
    loadingManifest: "Caricamento manifesto...",
    deviceDashboard: "Dashboard dispositivo",
    expertMode: "Modalità esperto",
    selectDevice: "Seleziona dispositivo",
    createNewDevice: "Crea nuovo dispositivo",
    title: "Titolo",
    fiatCurrency: "Valuta fiat",
    wifiSSID: "SSID WiFi",
    selectSSID: "--seleziona SSID--",
    enterManually: "Inserisci manualmente",
    enterSSIDManually: "Inserisci SSID manualmente",
    wifiPassword: "Password WiFi",
    saveConfiguration: "Salva configurazione",
    eraseDevice: "Cancella dispositivo",
    eraseWarning: "Vuoi cancellare il dispositivo prima dell'installazione",
    allDataLost: "Tutti i dati sul dispositivo andranno persi.",
    next: "Avanti",
    back: "Indietro",
    confirmInstallation: "Conferma installazione",
    doYouWantToInstall: "Vuoi installare",
    install: "Installa",
    installing: "Installazione in corso",
    preparingInstallation: "Preparazione installazione",
    erasing: "Cancellazione",
    thisWillTake: "Ci vorrà",
    aMinute: "un minuto",
    twoMinutes: "2 minuti",
    keepVisible: "Mantieni questa pagina visibile per evitare rallentamenti",
    installationComplete: "Installazione completata!",
    installationFailed: "Installazione fallita",
    logs: "Log",
    downloadLogs: "Scarica log",
    resetDevice: "Ripristina dispositivo",
    close: "Chiudi",
    success: "Successo",
    configSaved: "Configurazione salvata con successo!",
    expertModeWarning: "Attenzione: La modalità esperto è solo per utenti avanzati che si connettono a istanze LNBITS non Opago. Impostazioni errate possono causare malfunzionamenti del dispositivo. Vuoi continuare?",
    demoModeConfirm: "Sei sicuro di voler mettere il dispositivo in modalità demo?",
    connectionError: "La porta seriale non è leggibile/scrivibile. Chiudi qualsiasi altra applicazione che la sta utilizzando e riprova.",
    manifestError: "Impossibile scaricare il manifesto",
    error: "Errore",
    configure: "Configura",
    logsAndConsole: "Log e Console",
    installDevice: "Installa",
    downloadLogsButton: "Scarica log",
    resetDeviceButton: "Ripristina dispositivo",
    confirmEraseTitle: "Cancella dispositivo",
    confirmEraseMessage: "Vuoi cancellare il dispositivo prima dell'installazione",
    confirmEraseWarning: "Tutti i dati sul dispositivo andranno persi.",
    apiKey: "Chiave API",
    callbackUrl: "URL di callback",
    fiatPrecision: "Precisione Fiat",
    batteryMaxVolts: "Tensione max batteria",
    batteryMinVolts: "Tensione min batteria",
    contrastLevel: "Livello contrasto",
    logLevel: "Livello log"
  }
};

type SupportedLanguages = 'en' | 'de' | 'fr' | 'es' | 'it';

function getTranslation(key: keyof typeof translations.en, userLanguage: string = 'en'): string {
  // Convert user language to supported language, defaulting to 'en'
  const language = (userLanguage in translations) ? userLanguage as SupportedLanguages : 'en';
  return translations[language]?.[key] || translations.en[key] || key;
}

@customElement('ewt-install-dialog')
export class EwtInstallDialog extends LitElement {
  public port!: SerialPort;

  public manifestPath!: string;

  public logger: Logger = console;

  private _expertMode: boolean = false;

  @state() private _manifest!: Manifest;

  @state() private _state:
    | "ERROR"
    | "DASHBOARD"
    | "PROVISION"
    | "INSTALL"
    | "CONFIGURE"
    | "ASK_ERASE"
    | "LOGS"
    | "SUCCESS_MESSAGE" = "DASHBOARD";

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

  private _lastScanTime = 0;
  private readonly SCAN_COOLDOWN = 5000; // 5 seconds between scans

  private _currentReader?: ReadableStreamDefaultReader<Uint8Array>;
  private _currentWriter?: WritableStreamDefaultWriter<Uint8Array>;
  private _isPortLocked = false;

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
      //alert('Connection to the server failed. Please check your internet connection and try again. If the problem reappears, contact support@opago-pay.com');
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
    const manualInput = this.shadowRoot?.querySelector('#manualSSID') as HTMLInputElement | null;

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

  private _resetScanningState() {
    this.scanningSSIDs = false;
    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
    }
  }

  private _scanTimeout?: number;

  private async _populateDropdownWithSSIDs() {
    const now = Date.now();
    if (this.scanningSSIDs || (now - this._lastScanTime < this.SCAN_COOLDOWN)) {
      console.log("SSID scan skipped: too soon or already in progress");
      return;
    }

    this.scanningSSIDs = true;
    this._lastScanTime = now;

    try {
      const response = await this._scanSSIDs();
      if (response?.result) {
        const ssids = response.result;
        if (ssids.length > 0) {
          this.availableSSIDs = Array.from(new Set([...this.availableSSIDs, ...ssids]));
          this.requestUpdate();
        }
      }
    } catch (error) {
      console.error("Failed to process SSIDs:", error);
    } finally {
      this.scanningSSIDs = false;
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
    } else if (this._state === "SUCCESS_MESSAGE") {
      [heading, content, hideActions] = this._renderSuccessMessage();
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
    const heading = getTranslation("error", language);
    const content = html`
      <ewt-page-message .icon=${ERROR_ICON} .label=${label}></ewt-page-message>
      <ewt-button
        slot="primaryAction"
        dialogAction="ok"
        label=${getTranslation("close", language)}
      ></ewt-button>
    `;
    const hideActions = false;
    return [heading, content, hideActions];
  }

  _renderDashboard(): [string, TemplateResult, boolean, boolean] {
    if (!this._manifest) {
      return [
        getTranslation("loading", language),
        html`<div>${getTranslation("loadingManifest", language)}</div>`,
        true,
        false
      ];
    }

    const heading = getTranslation("deviceDashboard", language);
    let content: TemplateResult;
    let hideActions = true;
    let allowClosing = true;
  
    content = html`
      <div class="dashboard-buttons">
        <div>
          <ewt-button
            text-left
            .label=${`${getTranslation("installDevice", language)} ${this._manifest.name}`}
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
            label=${getTranslation("configure", language)}
            @click=${async () => {
              this._state = "CONFIGURE";
            }}
          ></ewt-button>
        </div>
        <div>
          <ewt-button
            label=${getTranslation("logsAndConsole", language)}
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
    let heading: string | undefined = getTranslation("deviceDashboard", language);
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
        <label>${getTranslation("expertMode", language)}:</label>
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
    </form>
    <ewt-button
      slot="primaryAction"
      label="Save Configuration"
      @click=${() => {
        this._saveConfiguration();
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
      try {
        const encoder = new TextEncoder();
        const dataStr = JSON.stringify(data) + "\n";
        const encodedData = encoder.encode(dataStr);
        await writer.write(encodedData);
      } finally {
        writer.releaseLock();
      }
    }
  
    // Read the response from the serial port
    if (this.port && this.port.readable) {
      const reader = this.port.readable.getReader();
      try {
        let completeData = '';
        const decoder = new TextDecoder();
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          completeData += decoder.decode(value, { stream: true });
          
          // Check for complete JSON response
          const responses = this.extractJsonResponses(completeData);
          for (const response of responses) {
            if (response.id === id && response.result) {
              reader.releaseLock();
              return response;
            }
          }
        }
      } catch (error) {
        console.error('Error reading from serial port:', error);
        throw error;
      } finally {
        reader.releaseLock();
      }
    }
  
    throw new Error("No valid response received");
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
    
    if (checkbox.checked) {
      // Show warning before enabling expert mode
      if (confirm('Warning: Expert mode is only for advanced users connecting to non-Opago LNBITS instances. Incorrect settings may cause the device to malfunction. Are you sure you want to continue?')) {
        this._expertMode = true;
      } else {
        checkbox.checked = false;
        return;
      }
    } else {
      this._expertMode = false;
      // Reset fields when disabling expert mode
      this._resetConfigurationFields();
    }
    
    this.requestUpdate();
  }

  private _resetConfigurationFields() {
    // Get all the relevant elements
    const titleInput = this.shadowRoot?.querySelector('#titleInput') as HTMLInputElement;
    const titleLabel = this.shadowRoot?.querySelector('#titleLabel') as HTMLDivElement;
    const currencySelect = this.shadowRoot?.querySelector('#fiatCurrency') as HTMLSelectElement;
    const currencyLabel = this.shadowRoot?.querySelector('#currencyLabel') as HTMLDivElement;
    const configSelect = this.shadowRoot?.querySelector('select[name="existingConfigs"]') as HTMLSelectElement;

    if (titleInput && titleLabel && currencySelect && currencyLabel && configSelect) {
      // Reset the device selector to "Create New Device"
      configSelect.value = 'createNewDevice';
      
      // Trigger the change event to properly update the UI
      const event = new Event('change');
      configSelect.dispatchEvent(event);
      
      // Show title and currency fields for new device
      titleInput.style.display = 'block';
      titleLabel.style.display = 'block';
      currencySelect.style.display = 'block';
      currencyLabel.style.display = 'block';
      
      // Clear any values
      titleInput.value = '';
      currencySelect.value = 'EUR'; // Reset to default currency

      // Reset any expert mode specific fields
      if (this.shadowRoot) {
        const apiKeyInput = this.shadowRoot.querySelector('input[name="apiKey.key"]') as HTMLInputElement;
        const callbackUrlInput = this.shadowRoot.querySelector('input[name="callbackUrl"]') as HTMLInputElement;
        if (apiKeyInput) apiKeyInput.value = '';
        if (callbackUrlInput) callbackUrlInput.value = '';
      }
    }
  }

  private async _releaseStreams() {
    try {
      if (this._currentReader) {
        try {
          await this._currentReader.cancel();
          this._currentReader.releaseLock();
        } catch (e) {
          console.log("Error releasing reader:", e);
        }
        this._currentReader = undefined;
      }
      
      if (this._currentWriter) {
        try {
          await this._currentWriter.close();
          this._currentWriter.releaseLock();
        } catch (e) {
          console.log("Error releasing writer:", e);
        }
        this._currentWriter = undefined;
      }
      
      this._isPortLocked = false;
    } catch (e) {
      console.error("Error in _releaseStreams:", e);
    }
  }

  private async _acquireStreams() {
    if (this._isPortLocked) {
      await this._releaseStreams();
    }

    // First, ensure any console component is disconnected
    const existingConsole = this.shadowRoot?.querySelector("ewt-console");
    if (existingConsole) {
      try {
        await existingConsole.disconnect();
        // Give a small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.log("Console disconnect error:", e);
      }
    }

    // Then try to reopen the port if needed
    if (!this.port || !this.port.readable || !this.port.writable) {
      try {
        await this.port?.close();
      } catch (e) {
        console.log("Port was already closed");
      }
      await this.port?.open({ baudRate: 115200 });
      
      if (!this.port || !this.port.readable || !this.port.writable) {
        throw new Error("Failed to initialize port");
      }
    }

    // Add additional checks for locked streams
    try {
      if (this.port.readable.locked) {
        console.log("Readable stream is locked, attempting to force release");
        try {
          const reader = this.port.readable.getReader();
          await reader.cancel();
          reader.releaseLock();
        } catch (e) {
          console.log("Error forcing readable stream unlock:", e);
        }
      }
      
      if (this.port.writable.locked) {
        console.log("Writable stream is locked, attempting to force release");
        try {
          const writer = this.port.writable.getWriter();
          await writer.close();
          writer.releaseLock();
        } catch (e) {
          console.log("Error forcing writable stream unlock:", e);
        }
      }

      // Now try to acquire the streams
      this._currentReader = this.port.readable.getReader();
      this._currentWriter = this.port.writable.getWriter();
      this._isPortLocked = true;
    } catch (e) {
      await this._releaseStreams();
      throw new Error("Failed to acquire streams: " + e);
    }
  }

  private async _saveConfiguration() {
    const form = this.shadowRoot?.querySelector('#configurationForm') as HTMLFormElement;
    if (!form) return;
  
    let formData = new FormData(form);
    let object: any = {};
    formData.forEach((value, key) => { object[key] = value });

    // Check if manual SSID should be used
    if (object.wifiSSID === 'manual' && object.manualSSID) {
      object.wifiSSID = object.manualSSID;
    }

    delete object.expertMode;
    delete object.manualSSID;
  
    // Prepare the data structure early
    const data = {
      "jsonrpc": "2.0",
      "id": "1",
      "method": "setconfig",
      "params": object
    };

    // If expert mode is enabled, write the data to json exactly as entered by the user
    if (this._expertMode) {
      // Skip API key validation in expert mode
    } else {
      // Check if an existing configuration is selected
      if (object.existingConfigs !== 'createNewDevice') {
        // Find the selected configuration
        const selectedConfig = this._existingConfigs.find(config => config.id === object.existingConfigs);
  
        if (selectedConfig) {
          // Replace fields with selected configuration
          data.params['apiKey.key'] = selectedConfig.key;
          data.params['callbackUrl'] = `https://${domain}/lnurldevice/api/v1/lnurl/${selectedConfig.id}`;
          data.params['fiatCurrency'] = selectedConfig.currency;
          data.params['fiatPrecision'] = '2';
          data.params['batteryMaxVolts'] = '4.2';
          data.params['batteryMinVolts'] = '3.3';
          data.params['contrastLevel'] = '75';
          data.params['logLevel'] = 'info';
  
          delete data.params.existingConfigs;
          delete data.params.title;
        }
      }
  
      // Check if "Create New Device" is selected
      if (object.existingConfigs === 'createNewDevice') {
        const newDevice = await this._createNewDevice();
        
        if (newDevice) {
          data.params['apiKey.key'] = newDevice.apiKey;
          data.params['callbackUrl'] = newDevice.callbackUrl;
          data.params['fiatPrecision'] = '2';
          data.params['batteryMaxVolts'] = '4.2';
          data.params['batteryMinVolts'] = '3.3';
          data.params['contrastLevel'] = '75';
          data.params['logLevel'] = 'info';
      
          delete data.params.existingConfigs;
          delete data.params.title;
        }
      }
  
      if (data.params['fiatCurrency'] === 'sat') {
        data.params['fiatPrecision'] = '0';
      }
  
      // Check if the API key or callback url are blank or default (only in non-expert mode)
      if (!data.params['apiKey.key'] || !data.params['callbackUrl'] || data.params['apiKey.key'] === 'BueokH4o3FmhWmbvqyqLKz') {
        // alert('Fetching API keys Failed: Please check your internet connection and try again. If the problem reappears, contact support@opago-pay.com');
        // return;
      }
      
      if (data.params['callbackUrl'] === 'https://opago-pay.com/getstarted') {
        if (!confirm('Are you sure you want to put the device in Demo Mode?')) {
          return;
        }
      }
    }

    try {
      // Close any existing connections and cleanup
      await this._releaseStreams();
      
      // Ensure any console is disconnected
      const existingConsole = this.shadowRoot?.querySelector("ewt-console");
      if (existingConsole) {
        await existingConsole.disconnect();
      }

      // Close and reopen the port completely
      try {
        await this.port?.close();
      } catch (e) {
        console.log("Port was already closed");
      }

      // Wait a moment before reopening
      await new Promise(resolve => setTimeout(resolve, 100));

      // Open fresh connection
      await this.port?.open({ baudRate: 115200 });
      
      if (!this.port || !this.port.readable || !this.port.writable) {
        throw new Error("Failed to initialize port");
      }

      // Get fresh streams
      const writer = this.port.writable.getWriter();
      const reader = this.port.readable.getReader();

      try {
        // Send configuration
        const encoder = new TextEncoder();
        const dataStr = JSON.stringify(data);
        window.console.log("Sending:", dataStr);
        const encodedData = encoder.encode(dataStr + "\n");
        await writer.write(encodedData);

        // Wait for confirmation
        let configSaved = false;
        let accumulatedChunk = '';
        const decoder = new TextDecoder();

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Timeout waiting for configuration confirmation")), 5000);
        });

        const readPromise = (async () => {
          while (!configSaved) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            console.log("Received:", chunk);
            
            accumulatedChunk += chunk;
            
            if (accumulatedChunk.includes("[info] Configurations saved successfully") || 
                (accumulatedChunk.includes("[info] Saving") && 
                 accumulatedChunk.includes("[info] JSON-RPC command received: setconfig"))) {
              configSaved = true;
              
              // Send restart command
              const resetCmd = {
                jsonrpc: "2.0",
                id: "2",
                method: "restart",
                params: {}
              };
              const resetEncoder = new TextEncoder();
              await writer.write(resetEncoder.encode(JSON.stringify(resetCmd) + "\n"));
              
              this._state = "SUCCESS_MESSAGE";
              break;
            }
          }
        })();

        await Promise.race([readPromise, timeoutPromise]);

      } finally {
        // Always release the streams
        try {
          await reader.cancel();
          reader.releaseLock();
        } catch (e) {
          console.log("Error releasing reader:", e);
        }
        try {
          await writer.close();
          writer.releaseLock();
        } catch (e) {
          console.log("Error releasing writer:", e);
        }
      }

    } catch (e) {
      this._state = "ERROR";
      this._error = `Failed to save configuration: ${(e as Error).message}`;
    } finally {
      this.scanningSSIDs = false;
    }
  }

  _renderAskErase(): [string | undefined, TemplateResult] {
    const heading = getTranslation("confirmEraseTitle", language);
    const content = html`
      <div>
        ${getTranslation("confirmEraseMessage", language)}
        ${this._manifest.name}? ${getTranslation("confirmEraseWarning", language)}
      </div>
      <ewt-formfield label=${getTranslation("eraseDevice", language)} class="danger">
        <ewt-checkbox></ewt-checkbox>
      </ewt-formfield>
      <ewt-button
        slot="primaryAction"
        label=${getTranslation("next", language)}
        @click=${() => {
          const checkbox = this.shadowRoot!.querySelector("ewt-checkbox")!;
          this._startInstall(checkbox.checked);
        }}
      ></ewt-button>
      <ewt-button
        slot="secondaryAction"
        label=${getTranslation("back", language)}
        @click=${() => {
          this._state = "DASHBOARD";
        }}
      ></ewt-button>
    `;
    return [heading, content];
  }

  _renderInstall(): [string | undefined, TemplateResult, boolean, boolean] {
    if (!this._manifest) {
      return ["Loading...", html`<div>Loading manifest...</div>`, true, false];
    }

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
    let heading: string | undefined = getTranslation("logs", language);
    let content: TemplateResult;
    let hideActions = false;

    content = html`
      <ewt-console .port=${this.port} .logger=${this.logger}></ewt-console>
      <ewt-button
        slot="primaryAction"
        label=${getTranslation("back", language)}
        @click=${async () => {
          const console = this.shadowRoot!.querySelector("ewt-console");
          if (console) {
            await console.disconnect();
          }
          this._state = "DASHBOARD";
          this._initialize();
        }}
      ></ewt-button>
      <ewt-button
        slot="secondaryAction"
        label=${getTranslation("downloadLogsButton", language)}
        @click=${() => {
          const console = this.shadowRoot!.querySelector("ewt-console");
          if (console) {
            textDownload(console.logs(), `esp-web-tools-logs.txt`);
            console.reset();
          }
        }}
      ></ewt-button>
      <ewt-button
        slot="secondaryAction"
        label=${getTranslation("resetDeviceButton", language)}
        @click=${async () => {
          const console = this.shadowRoot!.querySelector("ewt-console");
          if (console) {
            await console.reset();
          }
        }}
      ></ewt-button>
    `;

    return [heading, content!, hideActions];
  }

  public override willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("_state")) {
      this._resetScanningState();
      
      // Clean up streams when changing states
      if (this._state !== "CONFIGURE" && this._isPortLocked) {
        this._releaseStreams();
      }
      
      // Disconnect console when leaving logs view
      if (changedProps.get("_state") === "LOGS") {
        const console = this.shadowRoot?.querySelector("ewt-console");
        if (console) {
          console.disconnect();
        }
      }

      // Existing state change handling
      if (this._state !== "ERROR") {
        this._error = undefined;
      }

      if (this._state === "INSTALL") {
        this._installConfirmed = false;
        this._installState = undefined;
      }
    }
  }

  protected override async firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    await this._initialize();
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
      this.requestUpdate(); // Force update after manifest is loaded
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
    if (!this._manifest) {
      this._state = "ERROR";
      this._error = "Manifest not loaded";
      return;
    }

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
    await this._releaseStreams();
    
    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        console.error("Error closing port:", e);
      }
    }
    
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

  private _renderSuccessMessage(): [string, TemplateResult, boolean] {
    const heading = "Success";
    const content = html`
      <ewt-page-message
        .icon=${"🎉"}
        label="Configuration saved successfully!"
      ></ewt-page-message>
      <ewt-button
        slot="primaryAction"
        label="Close"
        @click=${async () => {
          // Close the port
          if (this.port) {
            try {
              await this.port.close();
            } catch (e) {
              console.error("Error closing port:", e);
            }
          }
          // Close the dialog and remove it
          this._handleClose();
        }}
      ></ewt-button>
    `;
    const hideActions = false;
    return [heading, content, hideActions];
  }
}

if (!customElements.get('ewt-install-dialog')) {
  customElements.define("ewt-install-dialog", EwtInstallDialog);
}

declare global {
  interface HTMLElementTagNameMap {
    "ewt-install-dialog": EwtInstallDialog;
  }
}

