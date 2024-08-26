let connectorTemplate = null;

figma.showUI(__html__, { width: 300, height: 300 });

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

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-connector') {
    if (!connectorTemplate) {
      connectorTemplate = findConnectorOnPage();
      if (!connectorTemplate) {
        figma.notify("No connector found on the page. Please create one first.");
        return;
      }
    }

    const selection = figma.currentPage.selection;
    if (selection.length !== 2) {
      figma.notify("Please select exactly two elements to connect.");
      return;
    }

    let [startElement, endElement] = selection;

    if (startElement.type !== "FRAME") {
      startElement = wrapInFrame(startElement);
    }
    if (endElement.type !== "FRAME") {
      endElement = wrapInFrame(endElement);
    }

    const newConnector = connectorTemplate.clone();
    figma.currentPage.appendChild(newConnector);

    // Apply styles
    newConnector.strokeWeight = parseInt(msg.strokeWeight);
    newConnector.strokes = [{ type: 'SOLID', color: hexToRgb(msg.strokeColor) }];
    
    if (msg.strokeType === 'DASHED') {
      newConnector.dashPattern = [5, 5];
    } else if (msg.strokeType === 'DOTTED') {
      newConnector.dashPattern = [1, 3];
    } else {
      newConnector.dashPattern = [];
    }

    // Ensure the connector starts at the first selected element and ends at the second
    newConnector.connectorStart = {
      endpointNodeId: startElement.id,
      magnet: "AUTO"
    };

    newConnector.connectorEnd = {
      endpointNodeId: endElement.id,
      magnet: "AUTO"
    };

    figma.currentPage.selection = [newConnector];
    figma.notify("Styled connector created successfully!");
  }
};