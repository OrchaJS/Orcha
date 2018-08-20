function executeWorkflow(flowObject) {
  const { StartAt: startAt, States: states } = flowObject;

  let currentFunc = startAt;
  let currentObject = states[currentFunc];
  let nextFunc;

  // Default prepend
  let output = `
  graph TB
  Start((Start))
  Start-.-> ${startAt}`;

  let keepGoing = true;

  while (keepGoing) {
    output += `
    ${currentFunc}
    `;

    if (currentObject) {
      nextFunc = currentObject.Next;
      output += `
      ${currentFunc} --> ${nextFunc}
      `;
    }

    currentFunc = currentObject.Next;
    currentObject = states[currentFunc];

    if (currentObject.End) {
      keepGoing = false;
      output += `
      ${currentFunc}-.->End((End));
      `;
    }
  }

  // Default append
  output += `
  classDef green fill:#9f6,stroke:#333,stroke-width:2px;
  class Start,End green`;

  return output;
}

module.exports = { executeWorkflow };
