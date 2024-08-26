let connectorTemplate = null;
let selectedColor = '#010101';  // default color
let selectedNodes = [];
let leftArrowEnabled = true;
let rightArrowEnabled = true;
let isDashedLine = false;
let isAdvancedMode = false;

figma.showUI(__html__, { width: 420, height: 280 });

function findConnectorOnPage() {
  return figma.currentPage.findOne(node => node.type === "CONNECTOR");
}

function wrapInFrame(element) {
  const frame = figma.createFrame();
  frame.resize(element.width, element.height);
  frame.x = element.x;
  frame.y = element.y;
  frame.fills = [];
  frame.name = "Wrapper Frame for " + element.name;
  element.parent.insertChild(element.parent.children.indexOf(element), frame);
  frame.appendChild(element);
  element.x = 0;
  element.y = 0;
  return frame;
}

function createConnector(element1, element2) {
  if (!connectorTemplate) {
    connectorTemplate = findConnectorOnPage();
    if (!connectorTemplate) {
      figma.notify("No connector found on the page. Please create one first.");
      return;
    }
  }

  let startElement = element1;
  let endElement = element2;

  if (startElement.type !== "FRAME") {
    startElement = wrapInFrame(startElement);
  }
  if (endElement.type !== "FRAME") {
    endElement = wrapInFrame(endElement);
  }

  const newConnector = connectorTemplate.clone();
  figma.currentPage.appendChild(newConnector);

  // Apply styles
  newConnector.strokes = [{ type: 'SOLID', color: figma.util.rgb(selectedColor) }];
  newConnector.strokeWeight = 2;
  
  if (isDashedLine) {
    newConnector.dashPattern = [5, 5];
  } else {
    newConnector.dashPattern = [];
  }

  // Set connector endpoints
  newConnector.connectorStart = {
    endpointNodeId: startElement.id,
    magnet: "AUTO"
  };

  newConnector.connectorEnd = {
    endpointNodeId: endElement.id,
    magnet: "AUTO"
  };

  // Set arrow heads
  newConnector.connectorStartStrokeCap = leftArrowEnabled ? 'ARROW_EQUILATERAL' : 'NONE';
  newConnector.connectorEndStrokeCap = rightArrowEnabled ? 'ARROW_EQUILATERAL' : 'NONE';

  figma.currentPage.selection = [newConnector];
  figma.notify("Connector created successfully!");
}

figma.on('selectionchange', () => {
  selectedNodes = figma.currentPage.selection;
  if (isAdvancedMode && selectedNodes.length === 2) {
    createConnector(selectedNodes[0], selectedNodes[1]);
    selectedNodes = [];
  }
  figma.ui.postMessage({
    type: 'selectionChanged',
    count: selectedNodes.length
  });
});

figma.ui.onmessage = msg => {
  if (msg.type === 'style-changed') {
    selectedColor = msg.color;
    leftArrowEnabled = msg.leftArrow;
    rightArrowEnabled = msg.rightArrow;
    isDashedLine = msg.isDashed;
  } else if (msg.type === 'connect-nodes') {
    if (selectedNodes.length === 2) {
      createConnector(selectedNodes[0], selectedNodes[1]);
    } else {
      figma.notify("Please select exactly two elements to connect.");
    }
  } else if (msg.type === 'advanced-mode-on') {
    isAdvancedMode = true;
    figma.notify("Advanced mode activated. Select elements to connect.");
  } else if (msg.type === 'advanced-mode-off') {
    isAdvancedMode = false;
    figma.notify("Advanced mode deactivated.");
  }
};