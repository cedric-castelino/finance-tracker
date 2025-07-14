import "cally";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DisplayTransactions from './DisplayTransactions';

function TransactionViewer() {
    const id = localStorage.getItem('token');
    const [typeShowing, setTypeShowing] = useState('Expense');
    const [allTransactions, setAllTransactions] = useState([]);
    const [shownTransactions, setShownTransactions] = useState([]);
    const [pagedTransactions, setPagedTransactions] = useState([]);
    const [selectedNote, setSelectedNote] = useState("");
    const [selectedTransaction, setSelectedTransaction] = useState({});
    const calendarRef = useRef(null);
    const calendarRef2 = useRef(null);
    const buttonRef = useRef(null);
    const buttonRef2 = useRef(null);
    const [searchTitle, setSearchTitle] = useState("");
    const [sortBy, setSortBy] = useState("Date");
    const [typeSort, setTypeSort] = useState("Descending");
    const [categorySort, setCategorySort] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sDateDisplay, setSDateDisplay] = useState('Start Date');
    const [eDateDisplay, setEDateDisplay] = useState('End Date');
    const typeSortRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await axios.get(`http://localhost:3000/transactions/${id}`);
                setAllTransactions(response.data.transactions);
                let listShownTransactions = response.data.transactions;
                listShownTransactions = listShownTransactions.filter(tx => tx.transactionType === "Expense");
                listShownTransactions.sort((a, b) => {
                    const [dayA, monthA, yearA] = a.date.split('/').map(Number);
                    const [dayB, monthB, yearB] = b.date.split('/').map(Number);
                    const dateA = new Date(yearA, monthA - 1, dayA);
                    const dateB = new Date(yearB, monthB - 1, dayB);
                    return dateB - dateA; 
                });
                setShownTransactions(listShownTransactions);
                setPages(listShownTransactions);
            } catch (err) {
                console.log(err);
            }
        };

        fetchTransactions();
    }, []);

    useEffect(() => {
        const calendar = document.querySelector('calendar-date');

        const handleChange = (e) => {
            const value = e.target.value; 
            if (value) {
                const [year, month, day] = value.split("-");
                const formatted = `${day}/${month}/${year}`;
                setSDateDisplay(formatted);
                setStartDate(formatted);
                document.getElementById("cally-popover1")?.hidePopover();
            }
        };

        calendar?.addEventListener('change', handleChange);
        return () => calendar?.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const calendar = document.querySelector('#cally-popover2 calendar-date');

        const handleChange = (e) => {
            const value = e.target.value;
            if (value) {
                const [year, month, day] = value.split("-");
                const formatted = `${day}/${month}/${year}`;
                setEDateDisplay(formatted);
                setEndDate(formatted);
                document.getElementById("cally-popover2")?.hidePopover();
            }
        };

        calendar?.addEventListener('change', handleChange);
        return () => calendar?.removeEventListener('change', handleChange);
    }, []);

    const setTheTransactions = (type) => {
        let listShownTransactions = allTransactions;
        listShownTransactions = listShownTransactions.filter(tx => tx.transactionType === type);
        listShownTransactions.sort((a, b) => {
            const [dayA, monthA, yearA] = a.date.split('/').map(Number);
            const [dayB, monthB, yearB] = b.date.split('/').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateB - dateA; 
        });
        setShownTransactions(listShownTransactions);
        setCurrentPage(1);
        setPages(listShownTransactions);
    };

    const openNoteModal = (note) => {
        setSelectedNote(note);
        document.getElementById("note_modal").showModal();
    };

    const showDeleteTransaction = (transaction) => {
        setSelectedTransaction(transaction);
        document.getElementById("delete_transaction").showModal();
    };

    const deleteTransaction = async () => {
        try {
            const response = await axios.delete(`http://localhost:3000/users/transactions/${id}/${selectedTransaction._id}`);
            updateSourceBalances(selectedTransaction.amount)
            if (response.data.modifiedCount > 0) {
                const updatedTransactions = allTransactions.filter(tx => tx._id !== selectedTransaction._id);
                setAllTransactions(updatedTransactions);
                setShownTransactions(updatedTransactions.filter(tx => tx.transactionType === typeShowing));
                setPages(updatedTransactions.filter(tx => tx.transactionType === typeShowing));
            }
            resetSearch();
        } catch (error) {
            console.log("Error deleting transaction:", error);
        }
    };

    const updateSourceBalances = async (newAmount) => {
        const response = await axios.get(`http://localhost:3000/sources/${id}`);
        let newSourceBalance = 0;
        let newRepaymentBalance = 0;
        let newRepayment;
        console.log(selectedTransaction);
        const newSource = response.data.sources.find(source => source.title === selectedTransaction.source); 
        if (selectedTransaction.category === 'Credit Repayment') {
          newSourceBalance = Number(newSource.balance) + Number(newAmount);
          newRepayment = response.data.sources.find(source => source.title === selectedTransaction.repayment); 
          newRepaymentBalance = Number(newRepayment.balance) - Number(newAmount);
        }
        if (selectedTransaction.category !== 'Credit Repayment' && selectedTransaction.transactionType === 'Income') {
          newSourceBalance = Number(newSource.balance) - Number(newAmount);
        }
        if (selectedTransaction.category !== 'Credit Repayment' && selectedTransaction.transactionType === 'Expense') {
          newSourceBalance = Number(newSource.balance) + Number(newAmount);
        }
        await axios.put(`http://localhost:3000/users/sources/${id}/balance`, { title: newSource.title, newBalance: newSourceBalance });
        if (selectedTransaction.category === 'Credit Repayment') { 
          await axios.put(`http://localhost:3000/users/sources/${id}/balance`, { title: newRepayment.title, newBalance: newRepaymentBalance });
        }
    }

    const handleToggle = () => {
        if (typeSort === "Descending") {
            setTypeSort("Ascending");
        } else {
            setTypeSort("Descending");
        }
     };

    const submitSearch = () => {
        let newShown = allTransactions;
        newShown = newShown.filter(tx => tx.transactionType === typeShowing);

        if (searchTitle !== '') {
            const keywords = searchTitle.toLowerCase().split(" ").filter(word => word.trim() !== "");
            const filtered = newShown.filter(item => {
                const title = item.title.toLowerCase();
                return keywords.every(word => title.includes(word));
            });
            newShown = filtered;
        }
        if (sortBy === 'Date') {
            newShown.sort((a, b) => {
                const [dayA, monthA, yearA] = a.date.split('/').map(Number);
                const [dayB, monthB, yearB] = b.date.split('/').map(Number);

                const dateA = new Date(yearA, monthA - 1, dayA);
                const dateB = new Date(yearB, monthB - 1, dayB);

                if (typeSort === 'Descending') {
                    return dateB - dateA; 
                }
                if (typeSort === 'Ascending') {
                    return dateA - dateB;
                }
            });
        }
        if (sortBy === 'Amount') {
            newShown.sort((a, b) => {
                const amountA = Number(a.amount);
                const amountB = Number(b.amount);

                if (typeSort === 'Descending') {
                    return amountB - amountA;
                }
                if (typeSort === 'Ascending') {
                    return amountA - amountB;
                }
            });
        }
        if (categorySort !== '' && categorySort !== 'Category') {
            newShown = newShown.filter(tx => tx.category === categorySort);
        }
        if (startDate !== '' && startDate !== 'Start Date') {
            const [startDay, startMonth, startYear] = startDate.split('/').map(Number);
            const start = new Date(startYear, startMonth - 1, startDay);

            newShown = newShown.filter(tx => {
                const [day, month, year] = tx.date.split('/').map(Number);
                const txDate = new Date(year, month - 1, day);
                return txDate >= start;
            });
        }
        if (endDate !== '' && endDate !== 'End Date') {
            const [endDay, endMonth, endYear] = endDate.split('/').map(Number);
            const end = new Date(endYear, endMonth - 1, endDay);

            newShown = newShown.filter(tx => {
                const [day, month, year] = tx.date.split('/').map(Number);
                const txDate = new Date(year, month - 1, day);
                return txDate <= end;
            });
        }

        setShownTransactions(newShown);
        setCurrentPage(1);
        setPages(newShown);
    };

    const resetSearch = () => {
        setSearchTitle('');
        setSortBy('Date');
        setTypeSort('Descending');
        setCategorySort('');
        setStartDate('');
        setEndDate('');
        setSDateDisplay("Start Date");
        setEDateDisplay("End Date");
        if (typeSortRef.current) {
            typeSortRef.current.checked = false;
        }
    };

    const setPages = (shown) => {
        setTotalPages(Math.ceil(shown.length / 10));
        setPagedTransactions(shown.slice(0, 10));
    };

    const handlePageChange = (pageNum) => {
        setCurrentPage(pageNum);
        const startIndex = (pageNum - 1) * 10;
        const endIndex = startIndex + 10;
        setPagedTransactions(shownTransactions.slice(startIndex, endIndex));
    };

    return (
        <>
            <div className="pl-4 pr-4 mb-6">
            <h1 className="text-4xl font-bold mt-5 text-start">Transaction Viewer</h1>
            <div className="flex w-full px-1 gap-3 mt-5">
                <button className={`btn flex-1 ${typeShowing === 'Income' ? 'btn-primary' : 'btn-outline btn-primary'}`} onClick={() => {
                    setTypeShowing('Income');
                    setTheTransactions('Income');
                }}>Income</button>
                <button className={`btn flex-1 ${typeShowing === 'Expense' ? 'btn-error' : 'btn-outline btn-error'}`} onClick={() => {
                    setTypeShowing('Expense');
                    setTheTransactions('Expense');
                }}>Expenses</button>
            </div>
            <div className="bg-base-300 w-full mt-5 rounded-lg pl-2 pr-2 pt-3">
                <label className="input mt-1 ml-4 mb-3 w-70">
                    <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <g
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeWidth="2.5"
                        fill="none"
                        stroke="currentColor"
                        >
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                        </g>
                    </svg>
                    <input type="search" className="grow" placeholder="Transaction Title" value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)}/>
                </label>
                <label className="input bg-base-200 ml-4 w-58 mt-1 mb-3">
                <span className="label !mr-0">Sort By</span>
                <div className="join">
                    <input type="radio" name="sort_main" onChange={() => setSortBy("Date")} className="radio radio radio-xs" checked={sortBy === "Date"} />
                    <div className="text-xs uppercase font-semibold opacity-60 ml-2 mr-2">Date</div>
                    <input type="radio" name="sort_main" onChange={() => setSortBy("Amount")} className="radio radio radio-xs" checked={sortBy === "Amount"} />
                    <div className="text-xs uppercase font-semibold opacity-60 ml-2">Amount</div>
                </div>
                </label>
                <label className="input bg-base-200 ml-4 w-52 mt-1 mb-3">
                <div className="join">
                    <div className="text-xs font-semibold opacity-60 mr-2 mt-1">Descending</div>
                    <label className="toggle text-base-content">
                        <input type="checkbox" onChange={handleToggle} ref={typeSortRef} />
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                        </label>
                        <div className="text-xs font-semibold opacity-60 ml-2 mt-1">Ascending</div>
                </div>
                </label>
                <label className="input mt-1 mb-3 p-0 ml-4 w-60">
                    <select className="select !mt-0 !w-full" value={categorySort} onChange={(e) => setCategorySort(e.target.value)}>
                        <option value="" disabled>
                            Category
                        </option>
                        {typeShowing === 'Income' &&
                            ['Salary', 'Youth Allowance', 'Other'].map((cat) => (
                            <option key={cat}>{cat}</option>
                        ))}

                        {typeShowing === 'Expense' &&
                            ['Food', 'Subscriptions', 'Shopping', 'Transportation', 'Going Out', 'Other', 'Credit Repayment'].map((cat) => (
                            <option key={cat}>{cat}</option>
                        ))}
                    </select>
                </label>
                <div className="w-full">
                <label className="input p-0 ml-4 mt-1 mb-3 w-30">
                <button
        ref={buttonRef}
        popoverTarget="cally-popover1"
        className="input input-border flex justify-between items-center gap-2"
        id="cally1"
        style={{ anchorName: '--cally1' }}
        >
        <span className="flex flex-row">{sDateDisplay}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 ml-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
            </svg>
        </span>
        </button>

        <div
          ref={calendarRef}
          popover="auto"
          id="cally-popover1"
          className="dropdown bg-base-100 rounded-box shadow-lg"
          style={{ positionAnchor: '--cally1' }}
        >
          <calendar-date className="cally">
            <svg
              aria-label="Previous"
              className="fill-current size-4"
              slot="previous"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M15.75 19.5 8.25 12l7.5-7.5"></path>
            </svg>
            <svg
              aria-label="Next"
              className="fill-current size-4"
              slot="next"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
            </svg>
            <calendar-month></calendar-month>
          </calendar-date>
        </div>
        </label>
        <label className="input p-0 ml-4 mt-1 mb-3 w-30">
                <button
        ref={buttonRef2}
        popoverTarget="cally-popover2"
        className="input input-border flex justify-between items-center gap-2"
        id="cally2"
        style={{ anchorName: '--cally2' }}
        >
        <span className="flex flex-row">{eDateDisplay}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 ml-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
            </svg>
        </span>
        </button>

        <div
          ref={calendarRef2}
          popover="auto"
          id="cally-popover2"
          className="dropdown bg-base-100 rounded-box shadow-lg"
          style={{ positionAnchor: '--cally2' }}
        >
          <calendar-date className="cally">
            <svg
              aria-label="Previous"
              className="fill-current size-4"
              slot="previous"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M15.75 19.5 8.25 12l7.5-7.5"></path>
            </svg>
            <svg
              aria-label="Next"
              className="fill-current size-4"
              slot="next"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
            </svg>
            <calendar-month></calendar-month>
          </calendar-date>
        </div>
        </label>
        </div>
        <div className="w-full">
        <label className="input p-0 ml-4 mt-1 mb-3 w-20">
                <button className="btn btn-secondary w-full" onClick={submitSearch}>Search</button>
                </label>
                <label className="input p-0 ml-2 mt-1 mb-3 w-20">
                <button className="btn w-full" onClick={resetSearch}>Reset</button>
                </label>
                </div>
            </div>
            {shownTransactions.length === 0 && (
                <div role="alert" className="alert alert-error mt-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>No Transactions Found</span>
                </div>
            )}
            {totalPages > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                    <button
                        className="btn btn-sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>

                    <span className="text-sm mt-1">
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        className="btn btn-sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
            {pagedTransactions.map(transaction => (
                <DisplayTransactions  
                key={transaction._id}
                transaction={transaction}
                onNoteClick={openNoteModal}
                show={showDeleteTransaction}
                />
            ))}
            <dialog id="note_modal" className="modal">
                <div className="modal-box">
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    </form>
                    <h3 className="font-bold text-lg">Transaction Note</h3>
                    <p className="py-4">{selectedNote}</p>
                </div>
            </dialog>
            <dialog id="delete_transaction" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Delete Transaction</h3>
                    <p className="py-4">Confirm that you would like to delete this transaction.</p>
                    <div className="modal-action">
                    <form method="dialog">
                        <button className="btn mr-4 btn-error btn-soft" onClick={deleteTransaction}>Delete</button>
                        <button className="btn">Cancel</button>
                    </form>
                    </div>
                </div>
            </dialog>
            </div>
        </>
      )
  }
  
  export default TransactionViewer