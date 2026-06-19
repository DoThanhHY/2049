import { Component, computed, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-game-board',
  imports: [],
  standalone: true,
  templateUrl: './game-board.html',
  styleUrl: './game-board.css',
})
export class GameBoard {

  private touchStartX = 0;
  private touchStartY = 0;

  @HostListener('window:pointerdown', ['$event'])
handlePointerDown(event: PointerEvent): void {
  this.touchStartX = event.clientX;
  this.touchStartY = event.clientY;
}

@HostListener('window:pointerup', ['$event'])
handlePointerUp(event: PointerEvent): void {
  const deltaX = event.clientX - this.touchStartX;
  const deltaY = event.clientY - this.touchStartY;

  const minSwipeDistance = 30; // ngưỡng tối thiểu để tính là vuốt, tránh nhận click nhầm

  // Nếu vuốt quá ngắn thì bỏ qua (coi như click nhầm, không phải swipe)
  if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
    return;
  }

  // So sánh độ lệch ngang vs dọc để biết vuốt theo hướng nào chiếm ưu thế
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Vuốt ngang
    this.move(deltaX > 0 ? 'right' : 'left');
  } else {
    // Vuốt dọc
    this.move(deltaY > 0 ? 'down' : 'up');
  }
}

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.move('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.move('right');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.move('down');
        break;
    }
  }
  
  board = signal<number[][]>(Array.from({length: 4}, () => Array(4).fill(0)));

  score = signal(0);
  bestScore = signal(this.loadBestScore());

  private loadBestScore(): number {
  const saved = localStorage.getItem('best-score-2048');
  return saved ? parseInt(saved, 10) : 0;
}

private updateBestScore(): void {
  if (this.score() > this.bestScore()) {
    this.bestScore.set(this.score());
    localStorage.setItem('best-score-2048', this.bestScore().toString());
  }
}

  isGameOver = computed(() => {
  const currentBoard = this.board();

  // Còn ô trống thì chưa thể game over
  const hasEmptyCell = currentBoard.some(row => row.some(cell => cell === 0));
  if (hasEmptyCell) return false;

  // Kiểm tra có cặp liền kề (ngang hoặc dọc) bằng nhau không
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const current = currentBoard[row][col];
      const right = currentBoard[row][col + 1];
      const down = currentBoard[row + 1]?.[col];

      if (current === right || current === down) {
        return false; // còn gộp được -> chưa game over
      }
    }
  }

  return true; // hết ô trống và không gộp được nữa
});

  constructor() {
    this.spawnTitle();
    this.spawnTitle();
  }

  private spawnTitle() {
    const currentBoard = this.board();  
    const emptyCells: {row: number; col: number}[] = [];

    for(let row = 0; row < 4; row++) {
      for(let col = 0; col < 4; col++) {
        if (currentBoard[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) return; 

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newValue = Math.random() < 0.9 ? 2 : 4;

    const newBoard = currentBoard.map(r => [...r]);
    newBoard[randomCell.row][randomCell.col] = newValue;
    this.board.set(newBoard);
  }

  // Xử lý 1 dòng: bỏ số 0, gộp số giống liền kề, rồi điền lại 0 cho đủ 4 ô
// Ví dụ: [2, 2, 4, 0] -> [4, 4, 0, 0]
//        [2, 0, 2, 2] -> [4, 2, 0, 0]
  private slideAndMergeRow(row: number[]): { result: number[]; gained: number } {
    // Bước 1: lọc bỏ số 0, chỉ giữ số thật
    const filtered = row.filter(val => val !== 0);
    const merged: number[] = [];
    let gained = 0;

    let i = 0;
    while (i < filtered.length) {
      // Nếu ô hiện tại bằng ô kế tiếp -> gộp lại thành 1 ô có giá trị x2
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const mergedValue = filtered[i] * 2;
        merged.push(mergedValue);
        gained += mergedValue;
        i += 2; // nhảy qua 2 ô vừa gộp
      } else {
        merged.push(filtered[i]);
        i += 1;
      }
    }

    // Bước 2: điền số 0 vào cuối cho đủ 4 ô
    while (merged.length < 4) {
      merged.push(0);
    }

    return { result: merged, gained };
  }

  // Transpose: đổi dòng thành cột (dùng cho hướng lên/xuống)
private transpose(board: number[][]): number[][] {
  const result: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      result[col][row] = board[row][col];
    }
  }
  return result;
}

// Hàm move chính: nhận hướng, trả về board mới + có di chuyển được không
private move(direction: 'left' | 'right' | 'up' | 'down'): void {
  if (this.isGameOver()) return; 
  let working = this.board().map(r => [...r]); // clone để không mutate trực tiếp
  let totalGained = 0;

  // Chuẩn hóa: mọi hướng đều quy về xử lý "trượt trái" trên từng dòng
  if (direction === 'up' || direction === 'down') {
    working = this.transpose(working);
  }
  if (direction === 'right' || direction === 'down') {
    working = working.map(row => [...row].reverse());
  }

  // Áp dụng slideAndMergeRow cho từng dòng
  const newRows = working.map(row => {
    const { result, gained } = this.slideAndMergeRow(row);
    totalGained += gained;
    return result;
  });

  // Đảo ngược lại đúng thứ tự ban đầu
  let finalBoard = newRows;
  if (direction === 'right' || direction === 'down') {
    finalBoard = finalBoard.map(row => [...row].reverse());
  }
  if (direction === 'up' || direction === 'down') {
    finalBoard = this.transpose(finalBoard);
  }

  // Kiểm tra board có thay đổi không (nếu không đổi thì không spawn ô mới)
  const hasChanged = JSON.stringify(finalBoard) !== JSON.stringify(this.board());

  if (hasChanged) {
    this.board.set(finalBoard);
    this.score.set(this.score() + totalGained);
    this.score.set(this.score() + totalGained);
    this.updateBestScore();
    this.spawnTitle();
  }
}

resetGame(): void {
  this.board.set(Array.from({ length: 4 }, () => Array(4).fill(0)));
  this.score.set(0);
  this.spawnTitle();
  this.spawnTitle();
}
}
