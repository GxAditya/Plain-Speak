import { Home, LogOut, FileText } from 'lucide-react';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from './ui/menubar';

interface DocumentAnalyzerNavbarProps {
  onNavigateToDashboard?: () => void;
  onSignOut?: () => void;
}

export function DocumentAnalyzerNavbar({ 
  onNavigateToDashboard, 
  onSignOut 
}: DocumentAnalyzerNavbarProps) {
  return (
    <div className="flex items-center justify-center py-4">
      <Menubar className="border bg-background rounded-md shadow-sm">
        <MenubarMenu>
          <MenubarTrigger 
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={onNavigateToDashboard}
          >
            Dashboard
          </MenubarTrigger>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Sign Out
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onSignOut}>
              Confirm Sign Out
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}
