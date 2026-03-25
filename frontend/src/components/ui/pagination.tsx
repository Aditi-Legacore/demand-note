import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | "ellipsis";

export default function Pagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const buildPageItems = (): PageItem[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pageSet = new Set<number>();
    const addRange = (start: number, end: number) => {
      for (let i = start; i <= end; i += 1) {
        if (i >= 1 && i <= totalPages) {
          pageSet.add(i);
        }
      }
    };

    pageSet.add(1);
    pageSet.add(totalPages);

    if (currentPage <= 3) {
      addRange(2, 5);
    } else if (currentPage >= totalPages - 2) {
      addRange(totalPages - 4, totalPages - 1);
    } else {
      addRange(currentPage - 1, currentPage + 1);
    }

    const sortedPages = Array.from(pageSet).sort((a, b) => a - b);
    const pageItems: PageItem[] = [];

    sortedPages.forEach((page, index) => {
      if (index > 0 && page - sortedPages[index - 1] > 1) {
        pageItems.push("ellipsis");
      }
      pageItems.push(page);
    });

    return pageItems;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pageItems = buildPageItems();

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <Button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        variant="outline"
        className="flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        Previous
      </Button>

      {pageItems.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-sm text-slate-500"
            aria-hidden
          >
            ...
          </span>
        ) : (
          <Button
            key={item}
            onClick={() => onPageChange(item)}
            variant={item === currentPage ? "default" : "outline"}
          >
            {item}
          </Button>
        )
      )}

      <Button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        variant="outline"
        className="flex items-center gap-1"
      >
        Next
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
