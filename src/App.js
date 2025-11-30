import React, { useState } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState('Not connected');
  const [isConnecting, setIsConnecting] = useState(false);

  // Connect to Bluetooth printer
  const connectToPrinter = async () => {
    try {
      setIsConnecting(true);
      setStatus('Requesting Bluetooth device...');

      // Request Bluetooth device with printer service
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Common printer service
        ],
        optionalServices: [
          '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Custom printer service
        ]
      });

      setStatus('Connecting to GATT Server...');
      const server = await device.gatt.connect();
      
      setDevice({ device, server });
      setStatus(`Connected to ${device.name || 'Bluetooth Printer'}`);
      setIsConnecting(false);
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      setStatus(`Error: ${error.message}`);
      setIsConnecting(false);
    }
  };

  // Disconnect from Bluetooth printer
  const disconnect = () => {
    if (device && device.server) {
      device.server.disconnect();
      setDevice(null);
      setStatus('Disconnected');
    }
  };

  // Print text to the Bluetooth printer
  const printText = async () => {
    if (!device) {
      alert('Please connect to a Bluetooth printer first!');
      return;
    }

    if (!text.trim()) {
      alert('Please enter some text to print!');
      return;
    }

    try {
      setStatus('Printing...');

      // Get the printer service
      const service = await device.server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      
      // Get the characteristic for writing
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // Convert text to bytes (ESC/POS commands)
      const encoder = new TextEncoder();
      
      // ESC/POS commands for formatting
      const ESC = 0x1B;
      const INIT = [ESC, 0x40]; // Initialize printer
      const LINE_FEED = [0x0A]; // Line feed
      const CUT_PAPER = [ESC, 0x69]; // Cut paper (if supported)
      
      // Combine commands
      const initCommand = new Uint8Array(INIT);
      const textBytes = encoder.encode(text);
      const feedCommand = new Uint8Array(LINE_FEED);
      const cutCommand = new Uint8Array(CUT_PAPER);
      
      // Write commands to printer
      await characteristic.writeValue(initCommand);
      await characteristic.writeValue(textBytes);
      await characteristic.writeValue(feedCommand);
      await characteristic.writeValue(feedCommand);
      await characteristic.writeValue(feedCommand);
      
      setStatus('Print completed successfully!');
    } catch (error) {
      console.error('Print error:', error);
      setStatus(`Print error: ${error.message}`);
      alert(`Failed to print: ${error.message}`);
    }
  };

  // Check if Web Bluetooth API is available
  const isBluetoothAvailable = () => {
    return 'bluetooth' in navigator;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📱 Bluetooth Printer App</h1>
        <p className="subtitle">Connect to your Bluetooth printer and print text</p>
      </header>

      <main className="App-main">
        {!isBluetoothAvailable() && (
          <div className="alert alert-error">
            ⚠️ Web Bluetooth API is not available in your browser. 
            Please use Chrome, Edge, or Opera on desktop or Android.
          </div>
        )}

        <div className="status-bar">
          <span className="status-label">Status:</span>
          <span className={`status-text ${device ? 'connected' : 'disconnected'}`}>
            {status}
          </span>
        </div>

        <div className="button-group">
          {!device ? (
            <button 
              onClick={connectToPrinter} 
              disabled={!isBluetoothAvailable() || isConnecting}
              className="btn btn-primary"
            >
              {isConnecting ? 'Connecting...' : '🔗 Connect to Printer'}
            </button>
          ) : (
            <button 
              onClick={disconnect} 
              className="btn btn-secondary"
            >
              🔌 Disconnect
            </button>
          )}
        </div>

        <div className="text-input-section">
          <label htmlFor="printText" className="input-label">
            Enter text to print:
          </label>
          <textarea
            id="printText"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your text here..."
            rows="10"
            className="text-area"
          />
        </div>

        <button 
          onClick={printText} 
          disabled={!device || !text.trim()}
          className="btn btn-success btn-print"
        >
          🖨️ Print Text
        </button>

        <div className="info-box">
          <h3>ℹ️ Instructions:</h3>
          <ol>
            <li>Make sure your Bluetooth printer is turned on and in pairing mode</li>
            <li>Click "Connect to Printer" and select your device from the list</li>
            <li>Type or paste the text you want to print in the textarea</li>
            <li>Click "Print Text" to send the text to your printer</li>
          </ol>
          <p className="note">
            <strong>Note:</strong> This app uses the Web Bluetooth API and works best in 
            Chrome, Edge, or Opera browsers. Make sure Bluetooth is enabled on your device.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
