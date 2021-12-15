let lineCaretPosition = 0,
    lastState, 
    lastStateTime;

function goToLineStart(nextMessage) {
  let str = '';

  for(; lineCaretPosition > nextMessage.length; lineCaretPosition--) {
    str += "\b \b";
  }

  for(let i = 0; i < lineCaretPosition; i++) {
    str += "\b";
  }

  lineCaretPosition = nextMessage.length;

  if(str) {
    process.stderr.write(str);
  }
}

module.exports = (percentage, msg, current, active, modulepath) => {
  let state = msg;

  if(percentage < 1) {
    percentage = Math.floor(percentage * 100);
    msg = `${percentage}% ${msg}`;

    if(percentage < 100) {
      msg = ` ${msg}`;
    }

    if(percentage < 10) {
      msg = ` ${msg}`;
    }

    modulepath = modulepath ? ` ...${modulepath.substr(modulepath.length - 50)}` : '';
    current = current ? ` ${current}` : '';
    active = active ? ` ${active}` : '';

    msg += `${current + active + modulepath }`;
  }

  if(process.env.BUILD_PROFILE) {
    state = state.replace(/^\d+\/\d+\s+/, '');

    if(percentage === 0) {
      lastState = null;
      lastStateTime = Date.now();
    } else if(state !== lastState || percentage === 1) {
      const now = Date.now();

      if(lastState) {
        const stateMsg = `${now - lastStateTime}ms ${lastState}`;

        goToLineStart(stateMsg);
        process.stderr.write(`${stateMsg}\n`);
        lineCaretPosition = 0;
      }

      lastState = state;
      lastStateTime = now;
    }
  }
  
  goToLineStart(msg);
  process.stderr.write(msg);
};
