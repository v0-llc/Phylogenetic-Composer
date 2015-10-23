var audioContext = new(window.AudioContext || window.webkitAudioContext)();

var analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
var bufferLength = analyser.frequencyBinCount;
var dataArray = new Uint8Array(bufferLength);

function getAverage(){
    analyser.getByteFrequencyData(dataArray);
    
    var runningValue = 0;
    
    for(var i = 0; i < dataArray.length; i++){
        runningValue += dataArray[i];
    }
    
    var average = runningValue/dataArray.length;
    
    //console.log(average);
}

var masterGain = audioContext.createGain();

var convolver;
convolver = audioContext.createConvolver();

masterGain.connect(convolver);
convolver.connect(audioContext.destination);

convolver.connect(analyser);

var request = new XMLHttpRequest();
request.open("GET", "audio/irsound.wav", true);
request.responseType = "arraybuffer";

request.onload = function () {
    audioContext.decodeAudioData(request.response, function (convolverBuffer) {
        convolver.buffer = convolverBuffer;
    });
};

request.send();

//masterGain.connect(audioContext.destination);

/* For Testing
var testOsc = audioContext.createOscillator();
testOsc.type="sine";
testOsc.frequency.value = 440.0;
testOsc.start();

testOscGainNode = audioContext.createGain();
testOscGainNode.gain.value = 0.5;
testOsc.connect(testOscGainNode);
testOscGainNode.connect(masterGain);
*/

var noteDurationValues = [0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0];

var AudioNode = function (newickNode) {
    this.setFrequency = function(note){
        this.noteValue = note;
        this.noteValue = convertToKey(this.noteValue);
        var freqValue = Math.pow(2, (this.noteValue - 69) / 12) * 440;
        this.vco.frequency.value = freqValue;
    };
    
    this.vco = audioContext.createOscillator();
    this.vco.type = "sine";

    this.setFrequency(Math.floor((Math.random() * 48 + 40)));

    this.vco.start();

    this.vca = audioContext.createGain();
    this.vca.gain.value = 0.0;

    this.delay = audioContext.createDelay();
    this.delay.delayTime.value = 0.5;

    this.feedback = audioContext.createGain();
    this.feedback.gain.value = 0.5;

    this.vca.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);

    this.feedback.connect(masterGain);

    var durationVal = newickNode.algorithmString.length;
    durationVal = (noteDurationValues.length+5) - durationVal;
    if(durationVal < 0){
        durationVal = 0;
    }
    if(durationVal > noteDurationValues.length-1){
        durationVal = noteDurationValues.length-1;
    }
    //this.noteLength = 1 / noteDurationValues[Math.floor(Math.random() * noteDurationValues.length)];
    this.noteLength = 1 / noteDurationValues[durationVal];
    this.noteStart;
    this.notePlaying = false;
    
    //this.attackTime = Math.random() * (this.noteLength);
    //this.releaseTime = Math.random() * (this.noteLength-this.attackTime);
    if(newickNode.peakLetter == 0){
        this.attackTime = 0;
    }else{
        this.attackTime = (newickNode.peakLetter/newickNode.displayString.length) * (this.noteLength);
    }
    this.releaseTime = this.noteLength - this.attackTime;

    this.vco.connect(this.vca);

    this.vca.connect(masterGain);

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