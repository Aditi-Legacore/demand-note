'use client';

import React from 'react';
import { Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlaintiffInformationCard from './PlaintiffInformationCard';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { IntakeData } from '@/types/intake';

interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

interface NotesTabProps {
  notes: Note[];
  loadingNotes: boolean;
  newNote: string;
  setNewNote: (value: string) => void;
  addNote: () => void;
  deleteNote: (noteId: string) => void;
  formatDate: (dateString: string | null) => string;
  intake: IntakeData;
  showPlaintiffCard: boolean;
  setShowPlaintiffCard: (show: boolean) => void;
}

export default function NotesTab({
  notes,
  loadingNotes,
  newNote,
  setNewNote,
  addNote,
  deleteNote,
  formatDate,
  intake,
  showPlaintiffCard,
  setShowPlaintiffCard,
}: NotesTabProps) {
  return (
    <div className="relative">
      {/* Plaintiff Info Button at top right */}
      <div className="flex justify-end mb-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPlaintiffCard(!showPlaintiffCard)}
          className="bg-green-600 text-white hover:bg-green-700 rounded-full p-3 shadow-lg lg:hidden"
          title="Plaintiff Info Button"
        >
          <User className="w-5 h-5" />
        </Button>
      </div>

      <Card className="w-full dark:bg-gray-900 bg-white shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
        {loadingNotes ? (
          <LoadingSkeleton
            message={null}
            rowCount={4}
            cardClassName="shadow-none border-none bg-transparent"
            contentClassName="p-0 space-y-3"
            rowWidths={["w-full", "w-4/5", "w-3/5", "w-2/5"]}
          />
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button onClick={addNote}>Add Note</Button>
            </div>
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-base text-black dark:text-gray-200">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(note.createdAt)} by {note.createdBy}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete note"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Sliding Plaintiff Info Card */}
    {showPlaintiffCard && (
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Centered Responsive Card */}
        <div className="absolute top-1/2 left-1/2 w-[90vw] h-[80vh] bg-white dark:bg-gray-900 shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-in-out rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlaintiffCard(false)}
            className="absolute top-2 right-2 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </Button>
          <div className="p-4 overflow-y-auto h-full pt-10">
            <PlaintiffInformationCard intake={intake} formatDate={formatDate} />
          </div>
        </div>
      </div>
    )}

    {/* Desktop small card */}
    {showPlaintiffCard && (
      <div className="hidden lg:block absolute top-0 right-0 w-80 bg-white dark:bg-gray-900 shadow-lg rounded-lg transform transition-transform duration-300 ease-in-out z-10">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-green-600">Plaintiff Information</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlaintiffCard(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </Button>
        </div>
        <div className="p-4 overflow-y-auto max-h-96">
          <PlaintiffInformationCard intake={intake} formatDate={formatDate} />
        </div>
      </div>
    )}
  </div>
  );
}
