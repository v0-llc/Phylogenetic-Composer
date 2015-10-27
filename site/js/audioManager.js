/*
This script handles most of the audio related tasks using the Web Audio API
*/

var audioContext = new(window.AudioContext || window.webkitAudioContext)(); // Create the context.
// This analyser is used to monitor the amplitude of the combined output of the audio context.
var analyser = audioContext.createAnalyser();
analyser.fftSize = 2048; // Fast Fourier Transform window size
var bufferLength = analyser.frequencyBinCount;
var dataArray = new Uint8Array(bufferLength);
var ampAverage;
// Get the average amplitude of all frequency ranges
function getAverage() {
    analyser.getByteFrequencyData(dataArray);

    var runningValue = 0;

    for (var i = 0; i < dataArray.length; i++) {
        runningValue += dataArray[i];
    }

    ampAverage = runningValue / dataArray.length;
}

var masterGain = audioContext.createGain(); // The main output VCA

var convolver;
convolver = audioContext.createConvolver(); // Convolution reverb

masterGain.connect(convolver); // Connect the main output to the reverb
convolver.connect(audioContext.destination);

masterGain.connect(analyser);
// Get the impulse response audio file for the convolution reverb
var request = new XMLHttpRequest();
request.open("GET", "audio/irsound.wav", true);
request.responseType = "arraybuffer";

request.onload = function () {
    audioContext.decodeAudioData(request.response, function (convolverBuffer) {
        convolver.buffer = convolverBuffer;
    });
};
request.send();

// Possible note length values.
var noteDurationValues = [0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0];

/* 
Every node on the tree has an associated "Audio Node".
This class handles things like the pitch, note length, and envelope shape of the node's audio.
Requires a Newick Node in the constructor, as this data is used to populate audio parameters.
*/

var AudioNode = function (newickNode) {
    // Sets the frequency of this node's oscillator, given a particular MIDI note value
    this.setFrequency = function (note) {
        this.noteValue = note;
        this.noteValue = convertToKey(this.noteValue);
        var freqValue = Math.pow(2, (this.noteValue - 69) / 12) * 440; // MIDI to frequency conversion
        // This is currently a hack, still working on pinpointing the issue...
        if (isFinite(freqValue)) {
            this.vco.frequency.value = freqValue;
        }
    };

    this.vco = audioContext.createOscillator(); // Each node has a sine wave oscillator
    this.vco.type = "sine";
    this.vco.start();

    this.vca = audioContext.createGain(); // The node's amplitude envelope, a simple AR (Attack-Release) envelope
    this.vca.gain.value = 0.0;

    // Feedback delay
    this.delay = audioContext.createDelay();
    this.delay.delayTime.value = 0.5;
    this.feedback = audioContext.createGain();
    this.feedback.gain.value = 0.5;

    this.vca.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);

    this.feedback.connect(masterGain); // to main output

    var durationVal = newickNode.algorithmString.length; // The length of the node's name effectively determines the note value
    durationVal = (noteDurationValues.length + 5) - durationVal;
    // Constraints
    if (durationVal < 0) {
        durationVal = 0;
    }
    if (durationVal > noteDurationValues.length - 1) {
        durationVal = noteDurationValues.length - 1;
    }
    this.noteLength = 1 / noteDurationValues[durationVal];

    this.noteStart;
    this.notePlaying = false;

    // The node's "peak letter" is the letter with the highest ASCII value. This determines the shape of the AR envelope
    if (newickNode.peakLetter == 0) {
        this.attackTime = 0;
    } else {
        this.attackTime = (newickNode.peakLetter / newickNode.displayString.length) * (this.noteLength);
    }
    this.releaseTime = this.noteLength - this.attackTime;

    this.vco.connect(this.vca);

    this.vca.connect(masterGain);

    // Function to trigger the AR amplitude envelope
    this.trigger = function () {
        this.noteStart = audioContext.currentTime;

        this.vca.gain.cancelScheduledValues(audioContext.currentTime);
        this.vca.gain.setValueAtTime(0, audioContext.currentTime);
        this.vca.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + this.attackTime);
        this.vca.gain.linearRampToValueAtTime(0.0, audioContext.currentTime + this.attackTime + this.releaseTime);

    };

};

// This is a weird implementation of note conversion - should probably just switch to something like noteToConvert%12...
function convertToKey(noteToConvert) {

    var checkedValue = noteToConvert / 12;
    checkedValue = checkedValue - Math.floor(checkedValue);
    checkedValue = checkedValue.toPrecision(3);

    var convertedNote = noteToConvert;

    if (checkedValue.match(/^(0.0833|0.250|0.500|0.667|0.833)$/)) {
        convertedNote++;
    }
    return convertedNote;
}
// Pause and play the audio context
function toggleAudio() {
    if (audioContext.state === 'running') {
        audioContext.suspend().then(function () {
            document.getElementById("audioToggle").classList.remove("audioOn");
            document.getElementById("audioToggle").classList.add("audioOff");
        });
    } else if (audioContext.state === 'suspended') {
        audioContext.resume().then(function () {
            document.getElementById("audioToggle").classList.remove("audioOff");
            document.getElementById("audioToggle").classList.add("audioOn");
        });
    }
}