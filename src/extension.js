/*
 * Name: Speed-Buzz: Internet Speed Meter
 * Description: A simple and minimal internet speed meter extension for Gnome Shell.
 * Author: Al-Amin Islam Hridoy
 * GitHub: https://github.com/HRIDOY-BUZZ/SpeedBuzz
 * License: GPLv3.0
 */

import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Shell from "gi://Shell";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";

const refreshTime = 1.0; // Set refresh time to one second.
const unitBase = 1024.0; // 1 Gb == 1024Mb or 1Mb == 1024Kb etc.
const units = ["KB/s", "MB/s", "GB/s", "TB/s"];
const defaultNetSpeedText = '↓ --.- -/-  ↑ --.- -/-';

let prevUploadBytes = 0,
    prevDownloadBytes = 0;
let containerButton, netSpeedLabel, refreshLoop;

const updateNetSpeed = () => {
    if (netSpeedLabel) {
        try {
            const lines = Shell.get_file_contents_utf8_sync('/proc/net/dev').split('\n');
            let uploadBytes = 0;
            let downloadBytes = 0;
            for (let i = 0; i < lines.length; ++i) {
                const line = lines[i].trim();
                const column = line.split(/\W+/);

                if (column.length <= 2) break;

                if (column[0] != 'lo' && !isNaN(parseInt(column[1])) && !column[0].match(/^br[0-9]+/) && !column[0].match(/^tun[0-9]+/) && !column[0].match(/^tap[0-9]+/) && !column[0].match(/^vnet[0-9]+/) && !column[0].match(/^virbr[0-9]+/)) {
                    uploadBytes += parseInt(column[9]);
                    downloadBytes += parseInt(column[1]);
                }
            }

            const uploadSpeed = (uploadBytes - prevUploadBytes) / (refreshTime * unitBase);
            const downloadSpeed = (downloadBytes - prevDownloadBytes) / (refreshTime * unitBase);

            netSpeedLabel.set_text(`↓ ${getFormattedSpeed(downloadSpeed)}  ↑ ${getFormattedSpeed(uploadSpeed)}`);

            prevUploadBytes = uploadBytes;
            prevDownloadBytes = downloadBytes;
            return true;
        } catch (e) {
            netSpeedLabel.set_text(defaultNetSpeedText);
        }
    }
    return false;
};

const getFormattedSpeed = (speed) => {
    let i = 0;
    while (speed >= unitBase && i < units.length - 1) {
        speed /= unitBase;
        i++;
    }
    return `${speed.toFixed(1)} ${units[i]}`;
};

export default class SpeedBuzzExtension extends Extension {
    enable() {
        containerButton = new St.Bin({
            style_class: 'panel-button',
            reactive: true,
            can_focus: false,
            x_expand: true,
            y_expand: false,
            track_hover: true
        });
        netSpeedLabel = new St.Label({
            text: defaultNetSpeedText,
            style_class: 'netSpeedLabel',
            y_align: Clutter.ActorAlign.CENTER
        });
        containerButton.set_child(netSpeedLabel);
        Main.panel._leftBox.add_child(containerButton);
        refreshLoop = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, refreshTime, updateNetSpeed);
    }

    disable() {
        if (refreshLoop) {
            GLib.source_remove(refreshLoop);
            refreshLoop = null;
        }
        if (containerButton) {
            Main.panel._leftBox.remove_child(containerButton);
            containerButton.destroy();
            containerButton = null;
        }
        if (netSpeedLabel) {
            netSpeedLabel.destroy();
            netSpeedLabel = null;
        }
    }
}