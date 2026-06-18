"use client";

import React from 'react';
import { Button, ButtonProps } from 'antd';
import { usePermissionStore } from '@/features/core/permissions/store';

interface CustomButtonProps extends ButtonProps {
    buttonKey: string; // Define the button key based on roleConfig
}

const BButton: React.FC<CustomButtonProps> = ({ buttonKey, children, ...props }) => {

    const { permissionData } = usePermissionStore();

    const isVisible = (key: string | number | bigint) => {
        const stringKey = key.toString();
        if (!permissionData || !permissionData[stringKey]) {
          return false; // Return false if roleMenuMapping is null or the key doesn't exist
        }
    
        const { visibility } = permissionData[stringKey]; // Destructure the visibility property
        return visibility ?? false; // Return visibility or false if undefined
      };
    
      // Check if user should have the item disabled
      const isDisabled = (key: string | number | bigint) => {
        const stringKey = key.toString();
        if (!permissionData || !permissionData[stringKey]) {
          return false; // Return false if roleMenuMapping is null or the key doesn't exist
        }
    
        const { access } = permissionData[stringKey]; // Destructure the access property
        return !access; // Return true if access is falsy, otherwise false
      };

    // If the button is not visible based on permissions, return null
    if (!isVisible(buttonKey)) {
        return null;
    }

    // Return the Ant Design Button with disabled state if applicable
    return (
        <Button disabled={isDisabled(buttonKey)} {...props}>
            {children}
        </Button>
    );
};

export default BButton;
