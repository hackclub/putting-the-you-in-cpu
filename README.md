<h1 align='center'>Putting the "You" in CPU</h1>
<p align='center'>by <a href='https://github.com/kognise'>@kognise</a>, with support by <a href='https://github.com/hackclub/hackclub#readme'>Hack Club</a></p>
<p align='center'>Have a thought or suggestion? Create an issue or pull request to this repository!</p>
<p align='center'><a href='https://kognise.dev/writing/putting-the-you-in-cpu'>Read my web edition</a> for nicer code blocks, good typography, and a table of contents.</p>
<br>
<!-- begin article (do not remove) -->

I've done [a lot of things with computers](https://github.com/kognise), but I've always had a gap in my knowledge: what exactly happens when you run a program on your computer? The other day I thought about this gap — I felt like I had most of the requisite low-level knowledge, but I was struggling to piece everything together. Are programs executing through the OS? Directly on the CPU? Something else? I've used syscalls, but how do they *work*? What are they, really? How do multiple programs run at once?

I finally cracked and decided to go all-in on figuring out as much as possible. It turns out that there aren't really any comprehensive resources on this unless you take a systems course in college, *so I had to find information across tons of different sources of varying quality and sometimes conflicting information!* A couple weeks of research and almost 40 pages of notes later, I think I have a much better idea of how computers work from startup to program execution. I would've killed for one solid article explaining what I learned, so I'm writing the article that I wished I had.

And you know what they say... you only truly understand something if you can explain it to someone else.

## Part 1: The "Basics"

My repeated epiphany while creating this article was how *simple* computers really are. I think the hardest thing for me was not psyching myself out by expecting more complexity than exists in reality. Modern computer architecture can be beautiful in its simplicity. Try not to psych yourself out; if at any point you catch yourself expecting more abstraction or complexity, it probably is actually that simple!

Let us begin by reviewing how your computer works at its very core.

### How Computers Are Architected

The *central processing unit* (CPU) of a computer is in charge of all computation. It's the big cheese. The shazam alakablam. It starts chugging as soon as you start your computer, executing instruction after instruction after instruction.

The first mass-produced CPU was the Intel 4004, designed in the late 60s by an Italian physicist and engineer named Federico Faggin. It was a 4-bit architecture instead of the 64-bit systems we use today, and it was much less complex than modern processors, but a lot of its simplicity does still remain.

The "instructions" that CPUs execute are just binary data: a byte or two to represent what instruction is being run (the opcode), followed by whatever data is needed to run the instruction. What we call *machine code* is nothing but a series of these binary instructions in a row. Assembly is a helpful syntax for reading and writing machine code that's easier for humans to read and write than raw bits; it is always compiled down to the binary that your CPU knows how to read.

<img src='https://doggo.ninja/Cv9OdX.png' width='400' />

> An aside: instructions aren't always represented 1:1 in machine code like the above example. For example, `add eax, 512` translates to `05 00 02 00 00`.
> 
> The first byte (`05`) is an opcode specifically representing *adding EAX to a 16-bit number*. The remaining bytes are 512 (`0x200`) in [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order.
>
> Defuse offers [a helpful tool](https://defuse.ca/online-x86-assembler.htm) for playing around with the translation between assembly and machine code.

RAM is your computer's main memory bank, a large multi-purpose space which stores all the data used by programs running on your computer. That includes the program code itself, and the code at the core of the operating system. The CPU always reads machine code directly from RAM, and code can't be run if it isn't loaded into RAM.

The CPU stores an *instruction pointer* which points to the location in RAM that it's going to fetch the next instruction from. After executing each instruction, the CPU moves the pointer and repeats. This is the *fetch-execute cycle*.

<div align='center'>
	<img src='https://doggo.ninja/23nqBP.png' width='360' />
</div>

After executing an instruction, the pointer moves forward to immediately after the instruction in RAM so that it now points to the next instruction. That's why code runs! The instruction pointer just keeps chugging forward, executing machine code in the order in which it's in memory. Some instructions can tell the instruction pointer to jump somewhere else instead, or jump different places depending on a certain condition; this makes reusable code and conditional logic possible.

This instruction pointer is stored in a *register*. Registers are small storage buckets that are extremely fast to read and write from. Each CPU architecture has a fixed set of registers, used for everything from storing temporary values during computations to configuring the processor.

Some registers are directly accessible from machine code, like `ebx` in the earlier diagram.

Other registers are only used internally by the CPU, but can often be updated or read using specialized instructions. One example is the instruction pointer which can't be read directly but can be updated with, for example, a jump instruction.

### Processors Are Naive

Let's go back to the original question: what happens when you run an executable file on your computer? First, a bunch of magic happens to prepare the execution — we’ll figure all of that out later — but at the end of the process there’s machine code in a file somewhere. The operating system loads this into RAM, and it instructs the CPU to jump the instruction pointer to that position in RAM. The CPU continues running its fetch-execute cycle as usual, so the program begins executing!

(This was one of those psyching-myself-out moments for me — seriously, this is how the program you are using to read this article is running. The CPU is fetching the program's instructions from RAM and running them directly on the CPU in order, and they're rendering this article.)

<img src='https://doggo.ninja/CuKAdU.png' width='400' />

It turns out CPUs have a super basic worldview; they only see the current instruction pointer and a bit of internal state. Processes are entirely operating system abstractions, not something CPUs natively understand or keep track of.

*\*waves hands\* processes are abstractions made up by ~~os devs~~ big byte to sell more computers*

For me, this raises more questions than it answers:

1. If the CPU doesn’t know about multiprocessing and just executes instructions sequentially, why doesn’t it get stuck inside whatever program it’s running? How can multiple programs run at once?
2. If programs run directly on the CPU, and the CPU can directly access RAM, why can't code access memory from other processes, or, god forbid, the kernel?
3. Speaking of which, what's the mechanism that prevents every process from running any instruction and doing anything to your computer? AND WHAT'S A DAMN SYSCALL?

The memory question is more complicated than you might expect — most memory accesses actually go through a layer misdirection that remap the entire address space. For now, I'm going to pretend that programs can access all RAM directly and computers can only run one process at once. We'll explain away both of these assumptions in time.

It's time to leap through our first rabbit hole into a land filled with syscalls and security rings.

> **Aside: what is a kernel, btw?**
> 
> Your computer's operating system, like macOS, Windows, or Linux, is the collection of software that runs on your computer and makes all the basic stuff work. "Basic stuff" is a really general term, and so is "operating system" — depending on who you ask, it can include such things as the apps, fonts, and icons that come with your computer by default.
> 
> The kernel, however, is the core of the operating system. When you boot up your computer, the instruction pointer starts at a program somewhere. That program is the kernel. The kernel has near-full access to your computer's memory, peripherals, and other resources, and is in charge of running software installed on your computer (known as userland programs). We'll learn about how the kernel has this access — and how userland programs don't — over the course of this article.
>
> Linux is just a kernel and needs plenty of userland software like shells and display servers to be usable. The kernel in macOS is called XNU and is Unix-like, and the modern Windows kernel is called the NT Kernel.

### Two Rings to Rule Them All

The *mode* (sometimes called privilege level or ring) a processor is in controls what it's allowed to do. Modern architectures have at least two options: kernel/supervisor mode and user mode. While an architecture might support more than two modes, only kernel mode and user mode are commonly used these days.

In kernel mode, anything goes: the CPU is allowed to execute any supported instruction and access any memory. In user mode, only a subset of instructions is allowed, I/O and memory access is limited, and many CPU settings are locked. Generally, operating systems and drivers run in kernel mode while applications run in user mode.

<div align='center'>
	<img src='https://doggo.ninja/C9ENjY.png' width='500' />
</div>

An example of how processor modes manifest in a real architecture: on x86-64, the current privilege level (CPL) can be read from a register called `cs` (code segment). Specifically, the CPL is contained in the two least significant bits of the `cs` register. Those two bits can store x86-64's four possible rings: ring 0 is kernel mode and ring 3 is user mode. Rings 1 and 2 are designed for running drivers but are only used by a handful of older niche operating systems. If the CPL bits are `11`, for example, the CPU is running in ring 3: kernel mode.
 
### What Even is a Syscall?

Programs run in user mode because they can't be trusted with full access to the computer. User mode does its job and prevents access to most of the computer. But programs *somehow* need to be able to access I/O, allocate memory, and interact with the operating system! To do so, software running in user mode has to ask the operating system kernel for help. The OS can then implement its own security protections to prevent programs from doing anything malicious.

If you've ever written code that interacts with the OS, you'll probably recognize functions like `open`, `read`, `fork`, and `exit`. At the lowest level, these are all *system calls*; the way programs can ask the OS for help. A system call is a special procedure that lets a program start a transition from user space to kernel space, jumping from the program's code into OS code.

User space to kernel space control transfers are accomplished using a processor feature called *software interrupts*:

1. During the boot process, the operating system stores a table called an *interrupt vector table* (x86-64 calls this the interrupt descriptor table) in RAM and registers it with the CPU. The IVT maps interrupt numbers to handler code pointers.
  <div align='center'><img src='https://doggo.ninja/lmiysV.png' width='250' /></div>
2. Then, userland programs can use an instruction like [INT](https://www.felixcloutier.com/x86/intn:into:int3:int1) which tells the processor to look up the given interrupt number in the IVT, switch to kernel mode, and then jump the instruction pointer to the memory address stored in the IVT.

When this kernel code finishes, it tells the CPU to switch back to user mode and return the instruction pointer to where it was when the interrupt was triggered. This is accomplished using an instruction like [IRET](https://www.felixcloutier.com/x86/iret:iretd:iretq).

(If you were curious, the standard interrupt id for syscalls is `0x80` on Linux.)

#### Wrapper APIs: Abstracting Away Interrupts

Here's what we know so far about system calls:

- User mode programs can't access I/O or memory directly. They have to ask the OS for help interacting with the outside world.
- Programs can delegate control to the OS with special machine code instructions like INT and IRET.
- Programs can't directly switch privilege levels; hardware interrupts are safe because the processor has been preconfigured *by the OS* with where in the OS code to jump to. The interrupt vector table can only be configured from kernel mode.

Programs need to pass data to the operating system when triggering a syscall; the OS needs to know which specific system call to execute alongside any data the syscall itself needs, for example, what filename to open. The mechanism for passing this data varies by operating system and architecture, but it's usually done by placing data in certain registers or on the stack before triggering the interrupt.

The variance in how system calls are called across devices means it would be wildly impractical for programmers to implement system calls themselves for every program. This would also mean operating systems couldn't change their interrupt handling for fear of breaking every program that was written to use the old system. Finally, we typically don't write programs in raw assembly anymore... programmers can't be expected to drop down to assembly any time they want to read a file or allocate memory.

<div align='center'>
	<img src='https://doggo.ninja/eX2rWN.png' width='650' />
</div>

So, operating systems provide an abstraction layer on top of these interrupts. Reusable higher-level library functions that wrap the necessary assembly instructions are provided by libc on Unix-like systems and part of a library called `ntdll.dll` on Windows. Calls to these library functions themselves don't cause switches to kernel mode, they're just standard function calls. Inside the libraries, assembly code does actually transfer control to the kernel, and is a lot more platform-dependent than the wrapping library subroutine.

When you call `exit(1)` from C running on a Unix-like system, that function is internally running machine code to trigger an interrupt, after placing the system call's opcode and arguments in the right registers/stack/whatever. Computers are so cool!

### The Need for Speed / Let's Get CISC-y

Many [CISC](https://en.wikipedia.org/wiki/Complex_instruction_set_computer) architectures like x86-64 contain instructions designed for system calls, created due to the prevalence of the system call paradigm.

Intel and AMD managed not to coordinate very well on x86-64; it actually has *two* sets of optimized system call instructions. [SYSCALL](https://www.felixcloutier.com/x86/syscall.html) and [SYSENTER](https://www.felixcloutier.com/x86/sysenter) are optimized alternatives to instructions like `INT 0x80`. Their corresponding return instructions, [SYSRET](https://www.felixcloutier.com/x86/sysret.html) and [SYSEXIT](https://www.felixcloutier.com/x86/sysexit), are designed to quickly transition back to user space and resume program code.

(AMD and Intel processors have slightly different compatibility with these instructions. `SYSCALL` is generally the best option for 64-bit programs, while `SYSENTER` has better support with 32-bit programs.)

As is typical, [RISC](https://en.wikipedia.org/wiki/Reduced_instruction_set_computer) architectures tend not to have such special instructions. AArch64, the RISC architecture Apple Silicon is based on, uses only [one interrupt instruction](https://developer.arm.com/documentation/ddi0596/2021-12/Base-Instructions/SVC--Supervisor-Call-) for syscalls and software interrupts alike. I think Mac users are doing fine&nbsp;:)

---

Whew, that was a lot! Let's do a brief recap:

- Processors execute instructions in an infinite fetch-execute loop and don't have any concept of operating systems or programs. The mode the processor is in, usually stored in a register, determines what instructions may be executed. Operating system code runs in kernel mode and switches to user mode to run programs.
- To run a binary, the operating system switches to user mode and points the processor to the code's entry point in RAM. Because they only have the privileges of user mode, programs that want to interact with the world need to jump to OS code for help. System calls are a standardized way for programs to switch from user mode to kernel mode and into OS code.
- Programs typically use these syscalls by calling shared library functions. These wrap machine code for either software interrupts or architecture-specific syscall instructions that transfer control to the OS kernel and switch rings. The kernel does its business and switches back to user mode and returns to the program code.

Let’s figure out how to answer my first question from earlier

> If the CPU doesn't keep track of more than one process and just executes instruction after instruction, why doesn't it get stuck inside whatever program it's running? How can multiple programs run at once?

The answer to this, my dear friend, is also the answer to why Coldplay is so popular... clocks! (Well, technically timers. I just wanted to shoehorn that joke in.)

## Part 2: Slice Dat Time

Let's say you're building an operating system and you want users to be able to run multiple programs at once. You don’t have a fancy multi-core processor though, so your CPU can only run one instruction at a time!

Luckily, you’re a very smart OS developer. You figure out that you can fake concurrency by letting processes take turns on the CPU. If you cycle through the processes and run a couple instructions from each one, they can all be responsive without any single process hogging the CPU.

How do you take control back from program code? After a bit of research, you discover that most computers come with timer chips. You can program a timer chip to trigger a switch to an OS interrupt handler after a certain amount of time passes.

### **Hardware Interrupts**

Earlier, we talked about how software interrupts are used to hand control from a userland program to the OS. These are called “software” interrupts because they’re voluntarily triggered by a program — machine code executed by the processor in the normal fetch-execute cycle tells it to switch control to the kernel.


<div align='center'>
	<img src='https://doggo.ninja/xG5REv.png' width='500' />
</div>

OS schedulers use *timer chips* like [PITs](https://en.wikipedia.org/wiki/Programmable_interval_timer) to trigger hardware interrupts for multitasking:

1. Before jumping to program code, the OS sets the timer chip to trigger an interrupt after some period of time.
2. The OS switches to user mode and jumps to the next instruction of the program.
3. When the timer elapses, it triggers a hardware interrupt to switch to kernel mode and jump to OS code.
4. The OS can now save where the program left off, load a different program, and repeat the process.

This is called *preemptive multitasking*; the interruption of a process is called *preemption*. If you’re, say, reading this article on a browser and also listening to music, your very own computer is probably following this cycle.

### Timeslice Calculation

A *timeslice* is the duration an OS scheduler allows a process to run before preempting it. The simplest way to pick timeslices is to give every process the same timeslice, perhaps in the 10&nbsp;ms range, and cycle through tasks in order. This is called *fixed timeslice round-robin* scheduling.

> Timeslices are sometimes also called "quantums." I think I deserve praise for not incessantly calling them that. In other jargon, Linux kernel devs use the time unit "jiffies" to count timer ticks at a fixed frequency. The jiffy frequency is typically 1000 Hz but can be configured at compile time.

A slight improvement to fixed timeslice scheduling is to pick a *target latency* — the ideal longest time for a process to respond. The target latency should be equal to the time it takes for a process to resume execution after being preempted. Timeslices are calculated by dividing the target latency by the total number of tasks; this is better than fixed timeslice scheduling because it eliminates wasteful task switching with fewer processes. With a target latency of 15&nbsp;ms and 10 processes, each process would get 15/10 or 1.5&nbsp;ms to run. With only 3 processes, each process gets a longer 5&nbsp;ms timeslice while still hitting the target latency.

Process switching is computationally expensive because it requires saving the entire state of the current program and restoring a different one. Past a certain threshold, too small a calculated timeslice can result in worse performance than having a longer fixed timeslice. It's common to have a fixed timeslice that serves as a lower bound when there are many processes. At the time of writing this article, Linux's scheduler uses a target latency of 6&nbsp;ms and a minimum granularity of 0.75&nbsp;ms.

<div align='center'>
	<img src='https://doggo.ninja/XBMA41.png' width='500' />
</div>

Round-robin scheduling with this basic timeslice calculation is close to what most computers do nowadays. It's still a bit naive; most operating systems tend to have more complex schedulers which take process priorities and deadlines into account. Since 2007, Linux has used a scheduler called "Completely Fair Scheduler." CFS does a bunch of very fancy computer science things to prioritize tasks and divvy up CPU time.

Every time the OS preempts a process it needs to load the new program's saved execution context, including its memory environment. This is accomplished by telling the CPU to use a different *page table*, the mapping from "virtual" to physical addresses. This is also the system that prevents programs from accessing each other's memory; we'll figure it out in-depth in part 5 of this article.

### Note #1: Kernel Preemptability

So far, we've been only talking about the preemption and scheduling of userland processes. Kernel code might make programs feel laggy if it took too long handling a syscall or executing driver code.

Modern kernels, including the Linux kernel, are preemptive. This means they're programmed in a way that allows kernel code itself to be interrupted and scheduled just like userland processes.

This isn't very important to know about unless you're writing a kernel or something, but basically every article I've read has mentioned it so I thought I would too! Extra knowledge is rarely a bad thing.

### Note #2: A History Lesson

Ancient operating systems, including classic Mac OS and versions of Windows long before NT, used a predecessor to preemptive multitasking. Rather than the OS deciding when to preempt programs, the programs themselves would choose to yield to the OS. They would trigger a software interrupt to say, "hey, you can let another program run now." These explicit yields were the only way for the OS to regain control and switch to the next scheduled process.

This is called *cooperative multitasking*. It has a couple major flaws: malicious or just poorly designed programs can easily freeze the entire operating system, and it's nigh impossible to ensure temporal consistency for realtime/time-sensitive tasks. For these reasons, the tech world switched to preemptive multitasking a long time ago and never looked back.

## Part 3: The Double-Click

So far, we've covered how CPUs execute machine code loaded from executables, what ring-based security is, and how syscalls work. In this section, we'll dive deep into the Linux kernel to figure out how programs are loaded and run in the first place.

We're specifically going to look at Linux on x86-64. Why?

- Linux is a fully featured production OS for desktop, mobile, and server use cases. Linux is open source, so it's super easy to research just by reading its source code. I will be directly referencing some kernel code in this article!
- x86-64 is the architecture that most modern desktop computers use, and the target architecture of a lot of code. The subset of behavior I mention that is x86-64-specific will generalize well.

Most of what we learn will generalize very well to other operating systems and architectures, even if they differ in various specific ways.

### Basic Behavior of Exec Syscalls

<div align='center'>
	<img src='https://doggo.ninja/2hUW7l.png' width='600' />
</div>

Let's start with a very important system call: `execve`. It loads a program and, if successful, replaces the current process with that program. A couple other syscalls (`execlp`, `execvpe`, etc.) exist, but they all layer on top of `execve` in various fashions.

> `execve` is *actually* built on top of `execveat`, a more general syscall that runs a program with some configuration options. For simplicity, we'll mostly talk about `execve`; the only difference is that it provides some defaults to `execveat`.

The call signature of `execve` is:

```c
int execve(const char *filename, char *const argv[], char *const envp[]);
```

- The `filename` argument specifies a path to the program to run.
- `argv` is a null-terminated (meaning the last item is a null pointer) list of arguments to the program. The `argc` argument you'll commonly see passed to C main functions is actually calculated later by the syscall, thus the null-termination.
- The `envp` argument contains another null-terminated list of environment variables used as context for the application. They're... conventionally `KEY=VALUE` pairs. *Conventionally.* I love computers.

Fun fact! You know that convention where a program's first argument is the name of the program? That's *purely a convention*, and isn't actually set by the `execve` syscall itself! The first argument will be whatever is passed to `execve` as the first item in the `argv` argument, even if it has nothing to do with the program name.

Interestingly, `execve` does have some code that assumes `argv[0]` is the program name. More on this later when we talk about interpreted scripting languages.

#### Step 0: Definition

We already know how syscalls work, but we've never seen a real-world code example! Let's look at the Linux kernel's source code to see how `execve` is defined under the hood:

[fs/exec.c](https://github.com/torvalds/linux/blob/22b8cc3e78f5448b4c5df00303817a9137cd663f/fs/exec.c#L2105-L2111):

```c
SYSCALL_DEFINE3(execve,
		const char __user *, filename,
		const char __user *const __user *, argv,
		const char __user *const __user *, envp)
{
	return do_execve(getname(filename), argv, envp);
}
```

`SYSCALL_DEFINE3` is a macro for defining a 3-argument system call's code.

> I was curious why the [arity](https://en.wikipedia.org/wiki/Arity) is hardcoded in the macro name; I googled around and learned that this was a workaround to fix [some security vulnerability](https://nvd.nist.gov/vuln/detail/CVE-2009-0029).

The filename argument is passed to a `getname()` function, which copies the string from user space to kernel space and does some usage tracking things. It returns a `filename` struct, which is defined in `include/linux/fs.h`. It stores a pointer to the original string in user space as well as a new pointer to the value copied to kernel space:

[include/linux/fs.h](https://github.com/torvalds/linux/blob/22b8cc3e78f5448b4c5df00303817a9137cd663f/include/linux/fs.h#L2294-L2300):

```c
struct filename {
	const char		*name;	/* pointer to actual string */
	const __user char	*uptr;	/* original userland pointer */
	int			refcnt;
	struct audit_names	*aname;
	const char		iname[];
};
```

The `execve` system call then calls a `do_execve()` function. This, in turn, calls `do_execveat_common()`with some defaults. The `execveat` syscall which I mentioned earlier also calls `do_execveat_common()`, but passes through more user-provided options.

In the below snippet, I've included the definitions of both `do_execve` and `do_execveat`:

[fs/exec.c](https://github.com/torvalds/linux/blob/22b8cc3e78f5448b4c5df00303817a9137cd663f/fs/exec.c#L2028-L2046):

```c
static int do_execve(struct filename *filename,
	const char __user *const __user *__argv,
	const char __user *const __user *__envp)
{
	struct user_arg_ptr argv = { .ptr.native = __argv };
	struct user_arg_ptr envp = { .ptr.native = __envp };
	return do_execveat_common(AT_FDCWD, filename, argv, envp, 0);
}

static int do_execveat(int fd, struct filename *filename,
		const char __user *const __user *__argv,
		const char __user *const __user *__envp,
		int flags)
{
	struct user_arg_ptr argv = { .ptr.native = __argv };
	struct user_arg_ptr envp = { .ptr.native = __envp };

	return do_execveat_common(fd, filename, argv, envp, flags);
}
```

\[spacing sic\]

In `execveat`, a file descriptor (a type of id that points to *some resource*) is passed to the syscall and then to `do_execveat_common`. This specifies the directory to execute the program relative to.

In `execve`, a special value is used for the file descriptor argument, `AT_FDCWD`. This is a shared constant in the Linux kernel that tells functions to interpret pathnames as relative to the current working directory. Functions that accept file descriptors usually include a manual check like <code>if&nbsp;(fd&nbsp;==&nbsp;AT_FDCWD) \{&nbsp;/\*&nbsp;special codepath&nbsp;\*/&nbsp;\}</code>.

#### Step 1: Setup

We've now reached `do_execveat_common`, the core function for executing programs. We're going to take a small step back from staring at code so we can get a more general idea of what's going on.

The first major job of `do_execveat_common` is setting up a struct called `linux_binprm`. I won't include a copy of [the whole struct definition](https://github.com/torvalds/linux/blob/22b8cc3e78f5448b4c5df00303817a9137cd663f/include/linux/binfmts.h#L15-L65), but there are a couple of important fields to go over:

- Data structures like `mm_struct` and `vm_area_struct` are defined to prepare virtual memory management for the new program.
- `argc` and `envc` are calculated and stored to be passed to the program.
- `filename` and `interp` store the filename of the program and its interpreter, respectively. These start out with the same value, but can change. One case where the binary being *executed* is different from the program name is when running interpreted programs like Python scripts with a [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)).
- `buf` is an array filled with the first 256 bytes of the file to be executed. It's used to detect the format of the file and load script shebangs.

(TIL: binprm stands for **bin**ary **pr**og**r**a**m**.)

Let's take a closer look at this buffer `buf`:

[include/linux/binfmts.h](https://github.com/torvalds/linux/blob/22b8cc3e78f5448b4c5df00303817a9137cd663f/include/linux/binfmts.h#L64):

```c
	char buf[BINPRM_BUF_SIZE];
```

As we can see, its length is defined as the constant `BINPRM_BUF_SIZE`. By searching the codebase for this string, we can find a definition for this in `include/uapi/linux/binfmts.h`:

[include/uapi/linux/binfmts.h](https://github.com/torvalds/linux/blob/22b8cc3e78f5448b4c5df00303817a9137cd663f/include/uapi/linux/binfmts.h#L18-L19):

```c
/* sizeof(linux_binprm->buf) */
#define BINPRM_BUF_SIZE 256
```

> What's the `uapi` in this path? Why isn't the length defined in the same file as the `linux_binprm` struct, `include/linux/binfmts.h`?
>
> UAPI stands for "userspace API In this case, it means someone decided that the length of the buffer should be part of the kernel's public API. In theory, everything UAPI is exposed to userland, and everything non-UAPI is private to kernel code.
>
> Kernel and user space code originally coexisted in one jumbled mass. In 2012, UAPI code was [refactored into a separate directory](https://lwn.net/Articles/507794/) as an attempt to improve maintainability.

So, the kernel loads the opening 256 bytes of the executed file into this memory buffer.

#### Step 2: Binfmts

The kernel's next major job is iterating through a bunch of "binfmt" (binary format) handlers. These handlers are defined in files like `fs/binfmt_elf.c` and `fs/binfmt_flat.c`. [Kernel modules](https://wiki.archlinux.org/title/Kernel_module) can also add their own binfmt handlers to the pool.

Each handler exposes a `load_binary()` function which takes a `linux_binprm` struct and checks if the handler understands the program's format.

This often involves looking for [magic numbers](https://en.wikipedia.org/wiki/Magic_number_(programming)) in the buffer, attempting to decode the start of the program (also from the buffer), and/or checking the file extension. If the handler does support the format, it prepares the program for execution and returns a success code. Otherwise, it quits early and returns an error code.

The kernel tries the `load_binary()` function of each binfmt until it reaches one that succeeds. Sometimes these will run recursively; for example, if a script has an interpreter specified and that interpreter is, itself, a script, the hierarchy might be `binfmt_script` > `binfmt_script` > `binfmt_elf` (where ELF is the executable format at the end of the chain).

#### Format Highlight: Scripts

Of the many formats Linux supports, `binfmt_script` is the first I want to specifically talk about.

Have you ever read or written a shebang? That line at the start of some scripts that specifies the path to the interpreter?

<!-- startLine: 1 -->
```bash
#!/bin/bash
```

I always just assumed these were handled by the shell, but no! Shebangs are actually a feature of the kernel, and scripts are executed with the same syscalls as every other program. Computers are *so cool*.

Take a look at how `fs/binfmt_script.c` checks if a file starts with a shebang:

[fs/binfmt_script.c](https://github.com/torvalds/linux/blob/22b8cc3e78f5448b4c5df00303817a9137cd663f/fs/binfmt_script.c#L40-L42):

```c
	/* Not ours to exec if we don't start with "#!". */
	if ((bprm->buf[0] != '#') || (bprm->buf[1] != '!'))
		return -ENOEXEC;
```

If the file does start with a shebang, the binfmt handler then reads the interpreter path and any space-separated arguments after the path. It stops when it hits either a newline or the end of the buffer.

There are two interesting, wonky things going on here.

**First of all**, remember that buffer in `linux_binprm` that was filled with the first 256 bytes of the file? That's used for executable format detection, but that same buffer is also what shebangs are read out of in `binfmt_script`.

During my research, I read an article that described the buffer as 128 bytes long. At some point after that article was published, the length was doubled to 256 bytes! Curious why, I checked the Git blame — a log of everybody who edited a certain line of code — for the line where `BINPRM_BUF_SIZE` is defined in the Linux source code. Lo and behold...

<img src='https://doggo.ninja/nHzI0U.png' width='550' />

COMPUTERS ARE SO COOL!

Since shebangs are handled by the kernel, and pull from `buf` instead of loading the whole file, they're *always* truncated to the length of `buf`. Apparently, 4 years ago, someone got annoyed by the kernel truncating their >128-character paths, and their solution was to double the truncation point by doubling the buffer size! Today, on your very own Linux machine, if you have a shebang line more than 256 characters long, everything past 256 characters will be *completely lost*.

<img src='https://doggo.ninja/qzrNW9.png' width='500' />

Imagine having a bug because of this. Imagine trying to figure out the root cause of what's breaking your code. Imagine how it would feel, discovering that the problem is deep within the Linux kernel. Woe to the next IT person at a massive enterprise who discovers that part of a path has mysteriously gone missing.

**The second wonky thing:** remember how it's only *convention* for `argv[0]` to be the program name? How the caller can really pass any `argv` they want to an exec syscall and it'll pass through unmoderated?

It just so happens that `binfmt_script` is one of those places that *assumes* `argv[0]` is the program name. It always removes `argv[0]`, and then adds the following to the start of `argv`:

- Path to the interpreter
- Arguments to the interpreter
- Filename of the script

So if the `argv` passed to the syscall is `[ "A", "B", "C" ]` and the shebang is `#!/usr/bin/node --experimental-module`, the modified `argv` will be `[ "/usr/bin/node", "--experimental-module", "B", "C" ]`.

After updating `argv`, the handler finishes preparing the file for execution by setting `linux_binprm.interp` to the interpreter path (in this case, the Node binary). Finally, it returns 0 to indicate success preparing the program for execution.

#### Format Highlight: Miscellaneous Interpreters

Another interesting handler is `binfmt_misc`. It opens up the ability to add some limited formats through userland configuration, by mounting a special file system at `/proc/sys/fs/binfmt_misc/`. Programs can perform specially formatted writes to files in this directory to add their own handlers. Each configuration entry specifies:

- How to detect their file format. This can either specify either a magic number at a certain offset or a file extension to look for.
- The path to an interpreter executable. There's no way to specify interpreter arguments, so a wrapper script is needed if those are desired.
- Some configuration flags, including one specifying how `binfmt_misc` updates `argv`.

This `binfmt_misc` system is often used by Java installations, configured to detect class files by their `0xCAFEBABE` magic bytes and JAR files by their extension. On my particular system, a  handler is configured that detects Python bytecode by its .pyc extension and passes it to the appropriate handler.

This is a pretty cool way to let program installers add support for their own formats without needing to write highly privileged kernel code.

### In The End

An exec syscall will always end up in one of two paths:

- It will eventually reach an executable binary format that it understands, perhaps after several layers of script interpreters, and run that code. At this point, the old code has been replaced.
- ... or it will exhaust all its options, tail between its legs, and return an error code to the calling program.

If you've ever used a Unix-like system, you might've noticed that shell scripts run from a terminal still execute if they don't have a shebang line or `.sh` extension. You can test this out right now if you have a non-Windows terminal handy:

<!-- name: Shell session -->
```
$ echo "echo hello" > ./file
$ chmod +x ./file
$ ./file
hello
```

(`chmod +x` tells the OS that a file is an executable. You won't be able to run it otherwise.)

So, why does the shell script run as a shell script? The kernel's format handlers should have no clear way of detecting shell scripts without any discernible label!

Well, it turns out that this behavior isn't part of the kernel. It's actually a common way for your *shell* to handle a failure case.

When you execute a file using a shell and the exec syscall fails, most shells will *retry executing the file as a shell script* by executing a shell with the filename as the first argument. Bash will typically use itself as this interpreter, while ZSH uses whatever `sh` is, usually [Bourne shell](https://en.wikipedia.org/wiki/Bourne_shell).

This behavior is so common because it's specified in *POSIX*, an old standard designed to make code portable between Unix systems. While POSIX isn't strictly followed by most tools or operating systems, many of its conventions are still shared.

> If \[an exec syscall\] fails due to an error equivalent to the `[ENOEXEC]` error, **the shell shall execute a command equivalent to having a shell invoked with the command name as its first operand**, with any remaining arguments passed to the new shell. If the executable file is not a text file, the shell may bypass this command execution. In this case, it shall write an error message and shall return an exit status of 126.
> 
> *Source: <cite>[Shell Command Language, POSIX.1-2017](https://pubs.opengroup.org/onlinepubs/9699919799.2018edition/utilities/V3_chap02.html#tag_18_09_01_01)</cite>*

Computers are so cool!

## Part 4: Becoming an Elf-Lord

<p>
	<div align='center'>
		<img src='https://doggo.ninja/2eXsg7.jpg' width='250' />
	</div>
</p>
<div align='center'>
	<div style='margin-top: -10px;'>
		(Thank you to <a href='https://ncase.me/' target='_blank'>Nicky Case</a> for the adorable drawing.)
	</div>
</div>

We pretty thoroughly understand `execve` now. At the end of most paths, the kernel will reach a final program containing machine code for it to launch. Typically, a setup process is required before actually jumping to the code — for example, different parts of the program have to be loaded into the right places in memory. Each program needs different amounts of memory for different things, so we have standard file formats that specify how to set up a program for execution. While Linux supports many such formats, the most common format by far is *ELF* (executable and linkable format).

> When you run an app or command-line program on Linux, it's exceedingly likely that it's an ELF binary. On macOS, the de-facto format is [Mach-O](https://en.wikipedia.org/wiki/Mach-O) instead, which does all the same things as ELF but slightly differently. On Windows, `.exe` files use the [Portable Executable](https://en.wikipedia.org/wiki/Portable_Executable) format which is, again, basically the same thing.

In the Linux kernel, ELF binaries are handled by the `binfmt_elf` handler, which is more complex than many other handlers and contains thousands of lines of code. It's responsible for parsing out certain details from the ELF file and using them to load the process into memory and execute it.

*I ran some command-line kung fu to sort binfmts by line count:*

<!-- name: Shell session -->
```
$ wc -l binfmt_* | sort -nr | sed 1d
    2181 binfmt_elf.c
    1658 binfmt_elf_fdpic.c
     944 binfmt_flat.c
     836 binfmt_misc.c
     158 binfmt_script.c
      64 binfmt_elf_test.c
```

### File Structure

Before looking more deeply at how `binfmt_elf` executes ELF files, let's take a look at the file format itself. ELF files are typically made up of four parts.

<div align='center'>
	<img src='https://doggo.ninja/QKEVvn.png' width='500' />
</div>

#### ELF Header

Every ELF file has an ELF header, and it has the very important job of conveying basic information about the binary such as:

- What processor it's designed to run on. ELF files can contain machine code for different processor types, like ARM and x86.
- Whether the binary is meant to be run on its own as an executable, or whether it's meant to be loaded by other programs as a "dynamically linked library." We'll go into details about dynamic linking later. [perhaps hide this part?]
- The entry point of the executable. Later sections specify exactly where to load data contained in the ELF file into memory. The entry point is a memory address pointing to where the first machine code instruction is in memory after the entire process has been loaded.

The ELF header is always at the start of the file. It specifies the locations of the program header table and section header, which can be anywhere within the file. Those tables, in turn, point to data stored elsewhere in the file.

#### Program Header Table

The program header table is a series of entries containing specific details for how to load and execute the binary at runtime. Each entry has a type field that says what detail it's specifying — for example, `PT_LOAD` means it contains data that should be loaded into memory, but `PT_NOTE` means the segment contains informational text that shouldn't necessarily be loaded anywhere.

<div align='center'>
	<img src='https://doggo.ninja/GfQ2au.png' width='500' />
</div>

Each entry specifies information about where its data is in the file and, sometimes, how to load the data into memory:

- It points to the position of its data within the ELF file.
- It can specify what virtual memory address the data should be loaded into memory at. This is typically left blank if the segment isn't meant to be loaded into memory.
- Two fields specify the length of the data: one for the length of the data in the file, and one for the length of the memory region to be created. If the memory region length is longer than the length in the file, the extra memory will be filled with zeroes. This is beneficial for programs that might want a static segment of memory to use at runtime; these empty segments of memory are typically called [BSS](https://en.wikipedia.org/wiki/.bss) segments.
- Finally, a flags field specifies what operations should be permitted if it's loaded into memory: `PF_R` makes it readable, `PF_W` makes it writable, and `PF_X` means it's code that should be allowed to execute on the CPU.

#### Section Header Table

The section header table is a series of entries containing information about *sections*. This section information is like a map, charting the data inside the ELF file. It makes it easy for programs like debuggers to understand the intended uses of different portions of the data.

<div align='center'>
	<img src='https://doggo.ninja/1wWVt9.png' width='450' />
</div>

For example, the program header table can specify a large swath of data to be loaded into memory together. That single `PT_LOAD` block might contain both code and global variables! There's no reason those have to be specified separately to *run* the program; the CPU just starts at the entry point and steps forward, accessing data when and where the program requests it. However, software like a debugger for *analyzing* the program needs to know exactly where each area starts and ends, otherwise it might try to decode some text that says "hello" as code (and since that isn't valid code, explode). This information is stored in the section header table.

While it's usually included, the section header table is actually optional. ELF files can run perfectly well with the section header table completely removed, and developers who want to hide what their code does will sometimes intentionally "strip" the section header table from their ELF binaries to make them harder to decode.

Each section has a name, a type, and some flags that specify how it's intended to be used and decoded. Standard names usually start with a dot by convention. The most common sections are:

- `.text`: machine code to be loaded into memory and executed on the CPU. `SHT_PROGBITS` type with the `SHF_EXECINSTR` flag to mark it as executable, and the `SHF_ALLOC` flag which means it's loaded into memory for execution. (Don't get confused by the name, it's still just binary machine code! I always found it somewhat strange that it's called `.text` despite not being readable "text.")
- `.data`: initialized data hardcoded in the executable to be loaded into memory. For example, a global variable containing some text might be in this section. If you write low-level code, this is the section where statics go. This also has the type `SHT_PROGBITS`, which just means the section contains "information for the program." Its flags are `SHF_ALLOC` and `SHF_WRITE` to mark it as writable memory.
- `.bss`: I mentioned earlier that it's common to have some allocated memory that starts out zeroed. It would be a waste to include a bunch of empty bytes in the ELF file, so a special segment type called BSS is used. It's helpful to know about BSS segments during debugging, so there's also a section header table entry that specifies the length of the memory to be allocated. It's of type `SHT_NOBITS`, and is flagged `SHF_ALLOC` and `SHF_WRITE`.
- `.rodata`: this is like `.data` except it's read-only. In a very basic C program that runs `printf("Hello, world!")`, the string "Hello world!" would be in a `.rodata` section, while the actual printing code would be in a `.text` section.
- `.shstrtab`: this is a fun implementation detail! The names of sections themselves (like `.text` and `.shstrtab`) aren't included directly in the section header table. Instead, each entry contains an offset to a location in the ELF file that contains its name. This way, each entry in the section header table can be the same size, making them easier to parse — an offset to the name is a fixed-size number, whereas including the name in the table would use a variable-size string. All of this name data is stored in its own section called `.shstrtab`, of type `SHT_STRTAB`.

#### Data

The program and section header table entries all point to blocks of data within the ELF file, whether to load them into memory, to specify where program code is, or just to name sections. All of these different pieces of data are contained in the data section of the ELF file.

<img src='https://doggo.ninja/o283Vt.png' width='680' />

### A Brief Explanation of Linking 

Back to the `binfmt_elf` code: the kernel cares about two types of entries in the program header table.

`PT_LOAD` segments specify where all the program data, like the `.text` and `.data` sections, need to be loaded into memory. The kernel reads these entries from the ELF file to load the data into memory so the program can be executed by the CPU.

The other type of program header table entry that the kernel cares about is `PT_INTERP`, which specifies a "dynamic linking runtime."

Before we talk about what dynamic linking is, let's talk about "linking" in general. Programmers tend to build their programs on top of libraries of reusable code — for example, libc, which we talked about earlier. When turning your source code into an executable binary, a program called a linker resolves all these references by finding the library code and copying it into the binary. This process is called *static linking*, which means external code is included directly in the file that's distributed.

However, some libraries are super common. You'll find libc is used by basically every program under the sun, since it's the canonical interface for interacting with the OS through syscalls. It would be a terrible use of space to include a separate copy of libc in every single program on your computer. Also, it might be nice if bugs in libraries could be fixed in one place rather than having to wait for each program that uses the library to be updated. Dynamic linking is the solution to these problems.

If a statically linked program needs a function `foo` from a library called `bar`, the program would include a copy of the entirety of `foo`. However, if it's dynamically linked it would only include a reference saying "I need `foo` from library `bar`." When the program is run, `bar` is hopefully installed on the computer and the `foo` function's machine code can be loaded into memory on-demand. If the computer's installation of the `bar` library is updated, the new code will be loaded the next time the program runs without needing any change in the program itself.

[Missing diagram: static vs dynamic linking. Static linking is on left with a function being copied into different files, and dynamic linking is on the right with pointers.]

### Dynamic Linking in the Wild

On Linux, dynamically linkable libraries like `bar` are typically packaged into files with the .so (Shared Object) extension. These .so files are ELF files just like programs — you may recall that the ELF header includes a field to specify whether the file is an executable or a library. A `.dynsym` section in the section header table contains information on the symbols that are exported from the file and can be dynamically linked to.

On Windows, libraries like `bar` are packaged into .dll (Dynamic Link Library) files. macOS uses the .dylib (DYnamically linked LIBrary) extension. These are formatted slightly differently from ELF files, but it's all the same concept.

An interesting distinction between the two types of linking is that with static linking, only the portions of the library that are used are included in the executable and thus loaded into memory. With dynamic linking, the *entire library* is loaded into memory. This might initially sound less efficient, but it actually allows modern operating systems to save *more* space by loading a library into memory once and then sharing that code between processes. Only code can be shared as the library needs different state for different programs, but the savings can still be on the order of tens to hundreds of megabytes of RAM.

### Execution

Let's hop on back to the kernel running ELF files: if the binary it's executing is dynamically linked, the OS can't just jump to the binary's code right away because there would be missing code — remember, dynamically linked programs only have references to the library functions they need!

To run the binary, the OS needs to figure out what libraries are needed, load them, replace all the named pointers with actual jump instructions, and *then* start the actual program code. This is very complex code that interacts deeply with the ELF format, so it's usually a standalone program rather than part of the kernel. ELF files specify the path to the program they want to use (typically something like `/lib64/ld-linux-x86-64.so.2`) in a `PT_INTERP` entry in the program header table.

After reading the ELF header and scanning through the program header table, the kernel can set up the memory structure for the new program. It starts by loading all `PT_LOAD` segments into memory, populating the program's static data, BSS space, and machine code. If the program is dynamically linked, the kernel will have to execute the ELF interpreter (`PT_INTERP`), so it also loads the interpreter's data, BSS, and code into memory.

Now the kernel needs to set the instruction pointer for the CPU to restore when returning to userland. If the executable is dynamically linked, the kernel sets the instruction pointer to the start of the ELF interpreter's code in memory. Otherwise, the kernel sets it to the start of the executable.

The kernel is almost ready to return from the syscall (remember, we're still in `execve`). It pushes the `argc`, `argv`, and environment variables to the stack for the program to read when it begins.

The registers are now cleared. Before handling a syscall, the kernel stores the current value of registers to the stack to be restored when switching back to user space. Before returning to user space, the kernel zeroes this part of the stack.

Finally, the syscall is over and the kernel returns to userland. It restores the registers, which are now zeroed, and jumps to the stored instruction pointer. That instruction pointer is now the starting point of the new program (or the ELF interpreter) and the current process has been replaced!

## Part 5: The Translator in Your Computer

Up until now, every time I've talked about reading and writing memory has been pretty wishy-washy. ELF files specify specific memory addresses to load data into, why aren't there problems with different processes trying to use conflicting memory? Why does each process seem to have a different memory environment?

Also, how exactly did we get here? We understand that `execve` is a syscall that *replaces* the current process with a new program, but this doesn't explain how multiple processes can be started. It definitely doesn't explain how the very first program runs — what chicken (process) lays (spawns) all the other eggs (other processes)?

We're nearing the end of our journey. After these two questions are answered, we'll have a mostly complete understanding of how your computer got from bootup to running the software you're using right now.

### Memory is Fake

So... about memory. It turns out that when the CPU reads from or writes to a memory address, it's not actually referring to that location in *physical* memory (RAM). Rather, it's pointing to a location in *virtual* memory space.
 
The CPU talks to a chip called a *memory management unit* (MMU). The MMU works like a translator, keeping track of a mapping between locations in virtual memory to the location in RAM which functions like a dictionary. When the CPU is given an instruction to read from memory address `0xAD4DA83F`, it asks the MMU to translate that address. The MMU looks it up in the dictionary, discovers that the matching physical address is `0x70B7BD74`, and sends the number back to the CPU. The CPU can then read from that address in RAM.

<div align='center'>
	<img src='https://doggo.ninja/EOU5pQ.png' width='600' />
</div>

When the computer first boots up, memory accesses go directly to physical RAM. Immediately after startup, the OS creates the translation dictionary and tells the CPU to start using the MMU.

This dictionary is actually called a *page table*, and this system of translating every memory access is called *paging*. Entries in the page table are called *pages* and each one represents how a certain chunk of virtual memory maps to RAM. These chunks are always a fixed size, and each processor architecture has a different page size. x86-64 has a default 4 KiB page size, meaning each page specifies the mapping for a block of memory 4,096 bytes long. (x86-64 also allows operating systems to enable larger 2 MiB or 4 GiB pages, which can improve address translation speed but increase memory fragmentation and waste.)

The page table itself just resides in physical RAM. While it can contain millions of entries, each entry's size is only on the order of a couple bytes, so the page table doesn't take up too much space.

<div align='center'>
	<img src='https://doggo.ninja/JAsawH.png' width='600' />
</div>

A great feature of paging is that the page table can be edited while the computer is running. This is what allows each process to have its own isolated memory space. When the OS switches context from one process to another, an important task is remapping the virtual memory space to a different area in physical memory. Let's say you have two processes: process A can have its code and data (likely loaded from an ELF file!) at `0x00200000`, and process B can access its code and data from the very same address. Those two processes can even be the same program, because they aren't actually fighting over that address range! The data for process A is somewhere far from process B in physical memory, and is mapped to `0x00200000` by the kernel when switching to the process.

[diagram: two processes accessing different parts of memory]

### Security with Paging

This process isolation improves code ergonomics (processes don't need to be aware of other processes to allocate memory), but it also creates a level of security: processes cannot access memory from other processes. This half answers one of the original questions from the start of this article:

> If programs run directly on the CPU, and the CPU can directly access RAM, why can't code access memory from other processes, or, god forbid, the kernel?

*Remember that? It feels like so long ago...*

What about that kernel memory, though? I mean, first things first: the kernel obviously needs to store plenty data of its own to keep track of all the processes running and even the page table itself. Every time a hardware interrupt, software interrupt, or system call is triggered and the CPU enters kernel mode, the kernel code needs to access that memory somehow.

Linux's solution is to always allocate the top half of the virtual memory space to the kernel, and for this reason is called a [*higher half kernel*](https://wiki.osdev.org/Higher_Half_Kernel). Windows employs a [similar](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/overview-of-windows-memory-space) technique, while macOS is... [slightly](https://www.researchgate.net/figure/Overview-of-the-Mac-OS-X-virtual-memory-system-which-resides-inside-the-Mach-portion-of_fig1_264086271) [more](https://developer.apple.com/library/archive/documentation/Performance/Conceptual/ManagingMemory/Articles/AboutMemory.html) [complicated](https://developer.apple.com/library/archive/documentation/Darwin/Conceptual/KernelProgramming/vm/vm.html) and caused my brain to ooze out of my ears reading about it.

[diagram of memory space with higher half kernel, with address ranges labeled]

It would be terrible for security if userland processes could read or write kernel memory, though, so paging enables a second layer of security: each page must specify permission flags. One flag determines whether the region is writable or only readable. Another flag tells the CPU that only kernel mode is allowed to access the region's memory. This latter flag is used to protect the entire higher half kernel space — the entire kernel memory space is actually available in the virtual memory mapping for user space programs, they just don't have the permissions to access it.

[diagram: page with annotations saying its permissions]

The page table itself is one of the many things contained within the kernel memory space. When the timer chip triggers a hardware interrupt for process switching, the CPU switches the privilege level to kernel mode and jumps to Linux kernel code. Being in kernel mode (Intel ring 0) allows the CPU to access the kernel-protected memory region. The kernel can then write to the page table (residing somewhere in that upper half of memory) to remap the lower half of virtual memory for the new process. When the kernel switches to the new process and the CPU enters user mode, it can no longer access any of the kernel memory.

### Hierarchical Paging and Other Optimizations

64-bit systems have memory addresses that are 64 bits long, meaning the theoretical max size for their virtual memory space is a whopping 16 [exbibytes](https://en.wiktionary.org/wiki/exbibyte). That is incredibly large, far larger than any computer that exists today or will exist any time soon. As far as I can tell, the most RAM in any computer ever was in the [Blue Waters supercomputer](https://en.wikipedia.org/wiki/Blue_Waters), with over 1.5 petabytes of RAM. That's still less than 0.01% of 16 EiB.

If an entry in the page table was required for every 4 KiB section of virtual memory space, you would need 4,503,599,627,370,496 page table entries. With 8-byte-long page table entries, you would need 32 pebibytes of RAM just to store the page table alone. You may notice that's still larger than the world record for largest RAM in a computer.

> **Aside: why the weird units?**
> 
> I know it's uncommon and really ugly, but I find it important to clearly differentiate between binary byte size units (powers of 2) and metric ones (powers of 10). A kilobyte, kB, is an SI unit that means 1,000 bytes. A kibibyte, KiB, is an IEC-recommended unit that means 1,024 bytes. In terms of CPUs and memory addresses, byte counts are usually powers of two because computers are binary systems. Using KB (or worse, kB) to mean 1,024 would be more ambiguous.

Since it would be impossible (or at least incredibly impractical) to have sequential page table entries for the entire possible virtual memory space, CPU architectures implement *hierarchical paging*. In hierarchical paging systems, there are multiple levels of page tables of increasingly small granularity. The top level entries cover large blocks of memory and point to page tables of smaller blocks, creating a tree structure. The individual entries for blocks of 4 KiB or whatever the page size is are the leaves of the tree.

x86-64 traditionally uses 4-level hierarchical paging. However, the designers also decided that there's no reason the address space has to be 16 EiB large, so they chose to ignore the top 16 bits of all virtual pointers. This allows page tables to be smaller. Each level of page table entry specifies bits that form its "prefix", meaning it covers all addresses starting with those bits. This shrinks the address space to 128 TiB, which is still sizable.

[diagram of 4 level hierarchical paging]

Many recent Intel processors implement [5-level paging](https://www.intel.com/content/www/us/en/content-details/671442/5-level-paging-and-5-level-ept-white-paper.html), adding another level of paging indirection as well as 9 more bits to expand the address space to 128 PiB. 5-level paging is supported by operating systems including Linux [since 2017](https://lwn.net/Articles/717293/) and recent Windows 10 and 11 server versions.

At any level of the tree, the pointer to the next entry can be null (`0x0`) to indicate that there  

The page table base registry

### Swapping

paging on windows, dirty bit

Virtual addresses are even used for IDT entries. How does this work? Top half kernel etc.

## Part 6: Let's Talk About Forks and Cows

Memory:
- Physical vs virtual memory. Why virtual memory?
	- Protections/security - process isolation, kernel isolation
	- Pages have different levels of protection. On Linux kernel memory is top half but not accessible unless you're in ring 0. macOS doesn't do this, completely separate kernel and user space memory
	- Optimizations - mmapping, cows, shared libraries
- Paging
	- Page tables are in physical memory
	- Multiple levels. Why? Optimization, it's easy to share table levels between processes. Something something caching?
	- MMU is a thing that exists, integral part of computer architecture, intervenes
	- Base of the page table PDBR is set in CR3 register
	- Paging and virtual memory is a CPU-level thing. Enabled via CR0 register
- mmap, demand paging, shared libraries are loaded 

Cows:
- You might’ve noticed execve replaces the current process rather than creating a new one. So how do you create new processes? Well another syscall called fork which clones the current process.
- Fork-exec pattern
- How does cow actually work? Page faults interrupts!
- Something something kernel memory access in interrupts, init process
- How do cow and demand paging actually work? Page faults, interrupts, fun fact
- Let's look at this more practically. All your process are kinda like a tree. They fork-exec down the tree. But the first process can't be fork-execed, bit of a chicken egg problem.
	- Kernel boot up process
	- Creation of init process (which fork-execs everything else)
- Cow. memory paging and structure of this
- As [comment] says, memory management can be a bitch
- Malloc allocates in virtual heap space
- (not here? Stack expands down with demand paging)

## Part 7: Epilogue

- This is all happening, not just "legacy" relics!
- ChatGPT 3 and GPT-4 acknowledgement, also Warp AI
- Funny implications of unix is not meant to be shut down
- Two Rings to Rule Them All
- Credits:
	- My parents
	- Nicky Case
	- Pradyun
	- Spencer Pogorzelski
	- https://github.com/ma1ted/
	- https://github.com/polypixeldev