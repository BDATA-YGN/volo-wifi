"use client";
import React from "react";
import { Card, Typography, Empty } from "antd";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useReceiptStore } from "../store";
import ElementRenderer from "./elements/ElementRenderer";

const { Title } = Typography;

interface BuilderPanelProps {
  className?: string;
}

const BuilderPanel: React.FC<BuilderPanelProps> = ({ className }) => {
  const { currentTemplate, selectElement, selectedElement, moveElement } = useReceiptStore();

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    moveElement(sourceIndex, destIndex);
  };

  return (
    <div className={`${className}`}>
      <Card title={<Title level={5}>Builder</Title>} style={{ overflowY: "auto", height: "var(--content-body-height)", border: "none" }}>
        {currentTemplate && (
          <div className="receipt-preview rounded mx-auto" style={currentTemplate.styles as React.CSSProperties}>
            {currentTemplate.elements.length === 0 ? (
              <Empty description="Drag elements from the sidebar" className="py-12" />
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="receipt-content">
                  {(provided, snapshot) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className={`drop-zone ${snapshot.isDraggingOver ? "active" : ""}`}>
                      {currentTemplate.elements.map((element, index) => (
                        <Draggable key={element.id} draggableId={element.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`content-element ${selectedElement?.id === element.id ? "selected" : ""} ${snapshot.isDragging ? "dragging" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectElement(element.id);
                              }}
                            >
                              <ElementRenderer element={element} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BuilderPanel;
