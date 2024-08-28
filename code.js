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

function applyConnectorStyle(connector) {
  connector.strokes = [{ type: 'SOLID', color: figma.util.rgb(selectedColor) }];
  connector.strokeWeight = 2;
  
  if (isDashedLine) {
    connector.dashPattern = [5, 5];
  } else {
    connector.dashPattern = [];
  }

  connector.connectorStartStrokeCap = leftArrowEnabled ? 'ARROW_EQUILATERAL' : 'NONE';
  connector.connectorEndStrokeCap = rightArrowEnabled ? 'ARROW_EQUILATERAL' : 'NONE';

  // Use ELBOWED type for more flexibility
  connector.connectorLineType = "ELBOWED";
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
  applyConnectorStyle(newConnector);

  // Determine the best connection points
  const startCenter = {
    x: startElement.x + startElement.width / 2,
    y: startElement.y + startElement.height / 2
  };
  const endCenter = {
    x: endElement.x + endElement.width / 2,
    y: endElement.y + endElement.height / 2
  };

  let startMagnet, endMagnet;

  if (Math.abs(startCenter.x - endCenter.x) > Math.abs(startCenter.y - endCenter.y)) {
    // Elements are more horizontal to each other
    startMagnet = startCenter.x < endCenter.x ? "RIGHT" : "LEFT";
    endMagnet = startCenter.x < endCenter.x ? "LEFT" : "RIGHT";
  } else {
    // Elements are more vertical to each other
    startMagnet = startCenter.y < endCenter.y ? "BOTTOM" : "TOP";
    endMagnet = startCenter.y < endCenter.y ? "TOP" : "BOTTOM";
  }

  // Set connector endpoints
  newConnector.connectorStart = {
    endpointNodeId: startElement.id,
    magnet: startMagnet
  };

  newConnector.connectorEnd = {
    endpointNodeId: endElement.id,
    magnet: endMagnet
  };

  figma.currentPage.selection = [newConnector];
  figma.notify("Connector created successfully!");
}

function updateSelectedConnectors() {
  const selectedConnectors = figma.currentPage.selection.filter(node => node.type === "CONNECTOR");
  if (selectedConnectors.length > 0) {
    selectedConnectors.forEach(connector => {
      applyConnectorStyle(connector);
    });
    figma.notify(`Updated ${selectedConnectors.length} connector(s)`);
  }
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
    updateSelectedConnectors();
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