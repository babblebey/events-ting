"use client";

/**
 * Breadcrumbs Component
 * Provides navigation breadcrumb trail for hierarchical navigation
 * Uses Flowbite React Breadcrumb component
 */

import { Breadcrumb, BreadcrumbItem as FlowbiteBreadcrumbItem } from "flowbite-react";
import { HiHome } from "react-icons/hi";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <Breadcrumb aria-label="Breadcrumb navigation" className={className}>
      <FlowbiteBreadcrumbItem href="/dashboard" icon={HiHome}>
        Dashboard
      </FlowbiteBreadcrumbItem>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <FlowbiteBreadcrumbItem
            key={index}
            href={!isLast && item.href ? item.href : undefined}
          >
            {item.label}
          </FlowbiteBreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}
