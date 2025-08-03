/**
 * 간단한 이벤트 버스 - 컴포넌트 간 통신용
 */
class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * 이벤트 리스너 등록
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // 언등록 함수 반환
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  /**
   * 이벤트 발생
   */
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('EventBus callback error:', error);
        }
      });
    }
  }

  /**
   * 모든 리스너 제거
   */
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const eventBus = new EventBus();
export default eventBus;