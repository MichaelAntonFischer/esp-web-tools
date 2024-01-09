// src/components/ewt-button.ts
import { css } from "lit";
import { ButtonBase } from "@material/mwc-button/mwc-button-base";
import { styles } from "@material/mwc-button/styles.css";

export class EwtButton extends ButtonBase {
  static override styles = [
    styles,
    css`
      .mdc-button {
        background-color: #EFBC3F; /* Yellow background color for button */
        color: #FFFFFF!important; /* White text color for button */
        border-radius: 4px; /* Slightly rounded corners */
        padding: 10px 20px; /* Comfortable padding */
        font-size: 16px; /* Readable font size */
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Subtle shadow for depth */
        transition: background-color 0.3s, color 0.3s; /* Smooth transition for hover effect */
        cursor: pointer; /* Indicates an interactive button */
      }
      .mdc-button:hover {
        background-color: #FFD985; /* Lighter yellow on hover */
        color: #000000; /* Black text color on hover */
      }
    `,
  ];
}

customElements.define("ewt-button", EwtButton);