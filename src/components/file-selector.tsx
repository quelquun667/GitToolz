
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import FileIcon from './file-icon';
import { FileCode2, Search } from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

type FileSelectorProps = {
  fileTree: string[];
  selectedFile: string;
  onFileSelect: (path: string) => void;
  isFetchingTree: boolean;
  triggerClassName?: string;
  dialogTitle?: string;
  dialogDescription?: string;
};

export default function FileSelector({
  fileTree,
  selectedFile,
  onFileSelect,
  isFetchingTree,
  triggerClassName,
  dialogTitle = "Select a file",
  dialogDescription = "Choose a file to continue.",
}: FileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredFiles = fileTree.filter((file) => file.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelect = (path: string) => {
    onFileSelect(path);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", triggerClassName)}
          disabled={isFetchingTree || fileTree.length === 0}
        >
          <div className="flex items-center gap-2">
            {selectedFile ? <FileIcon filename={selectedFile} /> : <FileCode2 className="h-4 w-4" />}
            <span className="truncate">{selectedFile || 'Select a file...'}</span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
           {dialogDescription && <DialogDescription>{dialogDescription}</DialogDescription>}
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="h-96">
          <div className="p-1">
            {filteredFiles.map((file) => (
              <div
                key={file}
                onClick={() => handleSelect(file)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm font-mono"
              >
                <FileIcon filename={file} />
                <span>{file}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
