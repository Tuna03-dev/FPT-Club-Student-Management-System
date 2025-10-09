import { Image } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const CreatePost = () => {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback className="bg-primary text-primary-foreground">
            CP
          </AvatarFallback>
        </Avatar>
        <button className="flex-1 text-left px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-full text-muted-foreground transition-colors">
          Bạn đang nghĩ gì?
        </button>
      </div>

      <div className="flex items-center mt-4 pt-4 border-t border-border">
        <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground hover:bg-secondary">
          <Image className="h-5 w-5 text-green-500" />
          <span>Ảnh</span>
        </Button>
      </div>
    </Card>
  );
};

