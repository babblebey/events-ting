/**
 * Shared UI components barrel export
 * Re-exports Flowbite React components with custom configurations
 */

// Flowbite React components (re-export for consistency)
export {
  Button,
  Badge,
  Card,
  Table,
  Modal,
  Spinner,
  Toast,
  TextInput,
  Textarea,
  Label,
  Select,
  Checkbox,
  Radio,
  Datepicker,
  Tabs,
  Dropdown,
  Avatar,
  Alert,
  Breadcrumb,
  Pagination,
  Sidebar as FlowbiteSidebar,
  Navbar,
  Footer,
  Timeline,
  Progress,
  Tooltip,
} from "flowbite-react";

// Custom theme configurations
export const customButtonTheme = {
  base: "group flex items-center justify-center p-0.5 text-center font-medium relative focus:z-10 focus:outline-none",
  color: {
    primary:
      "text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 enabled:hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800",
  },
};

export const customCardTheme = {
  root: {
    base: "flex rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800",
  },
};
