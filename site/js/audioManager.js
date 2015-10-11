var audioContext = new AudioContext;
var convolver = audioContext.createConvolver();

var masterGain = audioContext.createGain();
masterGain.connect(audioContext.destination);

var testOsc = audioContext.createOscillator();
testOsc.type="sine";
testOsc.frequency.value = 440.0;
testOsc.start();

testOscGainNode = audioContext.createGain();
testOscGainNode.gain.value = 0.5;
testOsc.connect(testOscGainNode);
//testOscGainNode.connect(masterGain);

var AudioNode = function(){
    this.vco = audioContext.createOscillator();
    this.vco.type = "sine";
    
    var noteValue = Math.floor((Math.random()*48+40)); 
    noteValue = convertToKey(noteValue);
    var freqValue = Math.pow(2, (noteValue-69)/12) * 440;    
    console.log("Note: " + noteValue + ", " + "Frequency: " + freqValue);
    
    this.vco.frequency.value = freqValue;
    this.vco.start();
    
    this.vca = audioContext.createGain();
    this.vca.gain.value = 0.0;
    
    this.attackTime = Math.random();
    this.releaseTime = Math.random();
    
    this.vco.connect(this.vca);
    
    this.vca.connect(masterGain);
    
    this.trigger = function(){
        this.vca.gain.cancelScheduledValues(audioContext.currentTime);
        this.vca.gain.setValueAtTime(0, audioContext.currentTime);
        this.vca.gain.linearRampToValueAtTime(0.1, audioContext.currentTime+this.attackTime);
        this.vca.gain.linearRampToValueAtTime(0.0, audioContext.currentTime+this.attackTime+this.releaseTime);
    };
};

// This is a weird implementation of note conversion - should probably just switch to something like noteToConvert%12...
function convertToKey(noteToConvert){
    
    var checkedValue = noteToConvert/12;
    checkedValue = checkedValue - Math.floor(checkedValue);
    checkedValue = checkedValue.toPrecision(3);
    
    var convertedNote = noteToConvert;
    
    if(checkedValue.match(/^(0.0833|0.250|0.500|0.667|0.833)$/)){
        convertedNote++;
    }
    return convertedNote;
}